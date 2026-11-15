import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../database/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/report_service.dart';
import '../../theme.dart';
import '../../widgets/cryma_widgets.dart';

class AdminCitationsScreen extends StatefulWidget {
  final int riderId;
  const AdminCitationsScreen({super.key, required this.riderId});

  @override
  State<AdminCitationsScreen> createState() => _AdminCitationsScreenState();
}

class _AdminCitationsScreenState extends State<AdminCitationsScreen> {
  UserModel? _rider;
  List<ReportModel> _reports = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rider = await AuthService.instance.getRiderById(widget.riderId);
    final reports = await ReportService.instance.getReportsForRider(widget.riderId);
    if (mounted) setState(() { _rider = rider; _reports = reports; _loading = false; });
  }

  void _showAddReport() {
    final reasonCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CrymaColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: CrymaColors.divider, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Add Citation', style: CrymaText.headingMedium),
              const SizedBox(height: 16),
              TextFormField(
                controller: reasonCtrl,
                decoration: const InputDecoration(labelText: 'Reason *', prefixIcon: Icon(Icons.gavel_outlined)),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Reason is required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description (optional)', alignLabelWithHint: true),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final superUserId = context.read<AuthProvider>().userId;
                  await ReportService.instance.createReport(
                    riderId: widget.riderId,
                    reason: reasonCtrl.text.trim(),
                    description: descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
                    createdBy: superUserId,
                  );
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  _load();
                },
                child: const Text('Add Citation'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _resolve(ReportModel r) async {
    await ReportService.instance.resolveReport(r.id);
    _load();
  }

  Future<void> _delete(ReportModel r) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete this citation?'),
        content: const Text('This will permanently remove the citation record.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: CrymaColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await ReportService.instance.deleteReport(r.id);
      _load();
    }
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.month}/${dt.day}/${dt.year}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Citations'),
        leading: BackButton(onPressed: () => context.go('/admin/riders/${widget.riderId}')),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showAddReport, tooltip: 'Add Citation'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_rider != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    color: CrymaColors.palePink,
                    child: Text('Rider: ${_rider!.fullName}', style: const TextStyle(fontWeight: FontWeight.w600, color: CrymaColors.primary)),
                  ),
                Expanded(
                  child: _reports.isEmpty
                      ? const EmptyState(icon: Icons.gavel_outlined, title: 'No active citations for this rider.', subtitle: 'Tap + to add a new citation.')
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _reports.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) {
                            final r = _reports[i];
                            final isActive = r.status == ReportStatus.active;
                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: CrymaColors.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isActive ? CrymaColors.warning.withValues(alpha: 0.4) : CrymaColors.divider),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text('Citation #${r.id}', style: CrymaText.headingSmall)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isActive ? CrymaColors.warningSurface : CrymaColors.statusDeliveredSurface,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          isActive ? 'ACTIVE' : 'RESOLVED',
                                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isActive ? CrymaColors.warning : CrymaColors.statusDelivered),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text('Date: ${_formatDate(r.createdAt)}', style: CrymaText.bodyMedium),
                                  Text('Reason: ${r.reason}', style: CrymaText.bodyMedium),
                                  if (r.description != null && r.description!.isNotEmpty)
                                    Text('Description: ${r.description}', style: CrymaText.bodyMedium),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      if (isActive)
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () => _resolve(r),
                                            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 8)),
                                            child: const Text('Resolve'),
                                          ),
                                        ),
                                      if (isActive) const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: () => _delete(r),
                                          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 8), side: const BorderSide(color: CrymaColors.error), foregroundColor: CrymaColors.error),
                                          child: const Text('Delete'),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
