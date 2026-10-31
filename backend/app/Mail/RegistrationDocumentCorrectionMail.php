<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistrationDocumentCorrectionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $firstName,
        public string $documentName,
        public string $reason,
        public string $correctionUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Action needed: replace a registration document - CRYMA');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.registration-document-correction');
    }

    public function attachments(): array
    {
        return [];
    }
}
