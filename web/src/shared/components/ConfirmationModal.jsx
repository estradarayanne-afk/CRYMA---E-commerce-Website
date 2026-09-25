function ConfirmationModal({
	isOpen,
	title = "Confirm action",
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	loading = false,
}) {
	if (!isOpen) return null;

	return (
		<div className="confirmation-overlay" role="dialog" aria-modal="true">
			<div className="confirmation-modal">
				<div className="confirmation-icon">?</div>

				<div className="confirmation-content">
					<h2>{title}</h2>
					<p>{message}</p>
				</div>

				<div className="confirmation-actions">
					<button
						type="button"
						className="confirmation-cancel"
						onClick={onCancel}
						disabled={loading}
					>
						{cancelText}
					</button>

					<button
						type="button"
						className="confirmation-confirm"
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? "Processing..." : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ConfirmationModal;