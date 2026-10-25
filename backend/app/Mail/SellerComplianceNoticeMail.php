<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SellerComplianceNoticeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $firstName,
        public string $action,
        public string $reason,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->action === 'warning'
                ? 'Seller Compliance Warning - CRYMA'
                : 'Seller Account Suspended - CRYMA',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.seller-compliance-notice',
            with: [
                'firstName' => $this->firstName,
                'action' => $this->action,
                'reason' => $this->reason,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
