<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CourierApplicationDecisionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $firstName,
        public bool $approved,
        public ?string $rejectionReason = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->approved
                ? 'Courier Application Approved - CRYMA'
                : 'Courier Application Update - CRYMA',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.courier-application-decision',
            with: [
                'firstName' => $this->firstName,
                'approved' => $this->approved,
                'rejectionReason' => $this->rejectionReason,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
