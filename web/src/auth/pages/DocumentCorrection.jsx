import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileCheck2, ShieldCheck, UploadCloud } from "lucide-react";
import api from "../../shared/services/api";
import "./DocumentCorrection.css";

const formatDocumentType = (value) => String(value || "registration document").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DocumentCorrection() {
    const [searchParams] = useSearchParams();
    const documentId = searchParams.get("document_id") || "";
    const token = searchParams.get("token") || "";
    const [document, setDocument] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let active = true;
        if (!documentId || !token) {
            setError("This replacement link is incomplete. Open the full link from your CRYMA email.");
            setLoading(false);
            return undefined;
        }
        api.get("/application/document-correction", { params: { document_id: documentId, token } })
            .then(({ data }) => { if (active) setDocument(data.data); })
            .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "This replacement link is invalid or expired."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [documentId, token]);

    const submit = async (event) => {
        event.preventDefault();
        if (!file || submitting) return;
        setSubmitting(true);
        setError("");
        try {
            const form = new FormData();
            form.append("document_id", documentId);
            form.append("token", token);
            form.append("file", file);
            const { data } = await api.post("/application/document-correction", form);
            setSuccess(data.message || "Your replacement was submitted for review.");
            setDocument(null);
            setFile(null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "The replacement could not be uploaded. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="document-correction-page">
            <section className="document-correction-card">
            <div className="document-correction-brand"><span><ShieldCheck size={20} /></span><strong>CRYMA</strong><small>APPLICATION REVIEW</small></div>
                {success ? <div className="document-correction-success" role="status"><span><FileCheck2 size={22} /></span><h1>Replacement received</h1><p>{success}</p><p>Your original submission and reviewer’s note remain in the review history. You can close this page while CRYMA checks the replacement.</p><Link to="/">Return to CRYMA</Link></div> : <>
                    <div className="document-correction-heading"><span className="document-correction-eyebrow">DOCUMENT CORRECTION</span><h1>Replace your document</h1><p>Upload a new copy so we can continue reviewing your application.</p></div>
                    {error && <div className="document-correction-alert" role="alert">{error}</div>}
                    {loading ? <p className="document-correction-loading" role="status">Checking your secure link…</p> : document && <>
                        <div className="document-correction-reason"><span>Document to replace</span><strong>{formatDocumentType(document.document_type)}</strong><span>Reviewer’s note</span><p>{document.rejection_reason || "Please provide a clearer or valid copy of this document."}</p></div>
                        <form onSubmit={submit}>
                            <label className="document-correction-upload">
                                <UploadCloud size={22} />
                                <strong>{file?.name || "Choose replacement file"}</strong>
                                <span>JPG, PNG, or PDF · Maximum 5 MB</span>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                            </label>
                            <button type="submit" disabled={!file || submitting}>{submitting ? "Submitting…" : "Submit replacement"}</button>
                        </form>
                        <p className="document-correction-footnote">Private link · Single use · Expires {document.expires_at ? new Date(document.expires_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "in 7 days"}</p>
                    </>}
                    <Link className="document-correction-back" to="/">Return to CRYMA</Link>
                </>}
            </section>
        </main>
    );
}
