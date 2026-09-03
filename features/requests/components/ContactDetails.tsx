import type { AcceptedContact } from "@/lib/types";

/**
 * Contact details, shown only to an accepted pair (FR-30, US-21).
 *
 * **Deliberately dumb** (BR-3.25 and the design's note). It takes an `AcceptedContact` and
 * renders it. It performs no status check, because putting one here would give the disclosure
 * rule a second home - and the rule already has one, in the RLS policy.
 *
 * The type is the safeguard: an `AcceptedContact` can only have come from the accepted-pair
 * read path, so if this component is rendered at all, disclosure was already authorised by the
 * database. A `PublicProfile` cannot be passed here (it has no phone or email), which is why
 * BR-3.27 keeps the two types distinct.
 */
export function ContactDetails({ contact }: { contact: AcceptedContact }) {
  return (
    <div
      data-testid="request-contact-details"
      className="space-y-1 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm"
    >
      <p className="font-medium">You are sharing this ride - here are the details you need.</p>
      {contact.phone ? (
        <p>
          Phone:{" "}
          <a
            href={`tel:${contact.phone.replace(/\s+/g, "")}`}
            data-testid="request-contact-phone"
            className="font-medium text-primary underline"
          >
            {contact.phone}
          </a>
        </p>
      ) : (
        <p className="text-muted-foreground">No phone number on their profile.</p>
      )}
      <p>
        Email:{" "}
        <a
          href={`mailto:${contact.email}`}
          data-testid="request-contact-email"
          className="font-medium text-primary underline"
        >
          {contact.email}
        </a>
      </p>
    </div>
  );
}
