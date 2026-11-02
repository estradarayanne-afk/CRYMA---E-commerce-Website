<?php

namespace App\Mail;

use DateTimeInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountReactivationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public DateTimeInterface $reactivatedAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'CRYMA Account Reactivation Notification');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-reactivation',
            with: [
                'userName' => $this->userName,
                'reactivatedAt' => $this->reactivatedAt,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
