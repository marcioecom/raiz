import type { components } from "@/api/schema"

import { Link } from "@tanstack/react-router"
import { Calendar, Clock, MapPin, Store } from "lucide-react"
import { useId } from "react"

import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTimeBR, formatShortDateBR } from "@/lib/format"
import { cn } from "@/lib/utils"

type HomeToday = NonNullable<components["schemas"]["Home"]["today"]>
type HomeEvent = NonNullable<HomeToday["events"]>[number]
type Offer = components["schemas"]["Offer"]

export interface TodayFeedProps {
  events: HomeEvent[]
  offers: Offer[]
}

export function TodayFeed({ events, offers }: TodayFeedProps) {
  const headingId = useId()

  if (events.length === 0 && offers.length === 0) {
    return (
      <section aria-label="Hoje no Capim">
        <EmptyState
          title="Sem eventos ou ofertas hoje"
          description="Ainda não há programação ou oferta ativa registrada para hoje. Escaneie um cupom ou acompanhe suas missões."
          icon={Calendar}
          action={
            <div className="flex w-full flex-wrap gap-2">
              <Link to="/scan" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Escanear cupom
              </Link>
              <Link to="/missoes" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Ver missões
              </Link>
            </div>
          }
        />
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId}>
      <Card className="p-5">
        <h2
          id={headingId}
          className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
        >
          Hoje no Capim
        </h2>

        {events.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Agenda no shopping
            </h3>
            <ul role="list" className="mt-1 divide-y divide-border">
              {events.map((event, index) => (
                <li
                  key={`${event.title ?? "evento"}-${event.starts_at ?? index}-${index}`}
                  className="py-3 first:pt-2 last:pb-0"
                >
                  {event.title && (
                    <p className="text-[0.9375rem] font-semibold leading-snug text-ink">
                      {event.title}
                    </p>
                  )}
                  {(event.starts_at || event.place) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] font-medium text-ink-muted">
                      {event.starts_at && (
                        <span className="inline-flex items-center gap-1">
                          <Clock
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                          <time dateTime={event.starts_at} className="tabular-nums">
                            {formatDateTimeBR(event.starts_at)}
                          </time>
                        </span>
                      )}
                      {event.place && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                          <span>{event.place}</span>
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {offers.length > 0 && (
          <div className={cn(events.length > 0 ? "mt-4 border-t border-border pt-4" : "mt-3")}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Ofertas de parceiros
            </h3>
            <ul role="list" className="mt-1 divide-y divide-border">
              {offers.map((offer, index) => (
                <li
                  key={offer.id ?? `${offer.title ?? "oferta"}-${index}`}
                  className="py-3 first:pt-2 last:pb-0"
                >
                  {offer.store_name && (
                    <p className="inline-flex items-center gap-1 text-xs font-semibold text-gold-text">
                      <Store
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span>{offer.store_name}</span>
                    </p>
                  )}
                  {offer.title && (
                    <p className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-ink">
                      {offer.title}
                    </p>
                  )}
                  {offer.description && (
                    <p className="mt-1 text-sm leading-5 text-ink-muted">{offer.description}</p>
                  )}
                  {offer.valid_until && (
                    <p className="mt-1 text-[0.8125rem] font-medium text-ink-muted">
                      Válida até{" "}
                      <time dateTime={offer.valid_until} className="tabular-nums">
                        {formatShortDateBR(offer.valid_until)}
                      </time>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  )
}
