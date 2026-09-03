# Performance Test Instructions

## Applicability: NOT APPLICABLE

**No performance testing is planned or required**, and this file records why rather than leaving
the stage's checklist item silently unanswered.

## Why

| Requirement | States |
|---|---|
| **NFR-4** | Under 50 employees, a handful of concurrent users, **no performance engineering required** |
| **Q39=A** | "Small internal POC - no performance work needed" |
| **TC-7** | Local development only - there is no deployed environment to load |
| **Q43=A** | Success is a clickable end-to-end demo |

There are no response-time, throughput or concurrency targets to test against, because none were
specified. Inventing thresholds and measuring against them would produce numbers with no
requirement behind them.

## What was done instead

Indexes were added where the query shapes are known, so the design is not gratuitously slow:

| Index | Serves |
|---|---|
| `rides_search_idx` on (departs_at, origin_area_id, destination_area_id) where active | FR-18 search |
| `rides_driver_idx` on (driver_id, departs_at) | FR-39 My Rides |
| `ride_requests_ride_status_idx` on (ride_id, status) | The driver's list and the accepted count |
| `ride_requests_passenger_idx` on (passenger_id, created_at desc) | FR-40 My Requests |
| `profiles_home_area_id_idx` | Profile area lookups |

The FR-18 date filter uses a half-open range rather than a `departs_at::date` cast, specifically
so `rides_search_idx` remains usable.

## One known non-scaling choice, recorded

`countAcceptedByRideIds` counts rows in application code rather than with a grouped SQL
aggregate. At NFR-4's scale the row set is tiny. **It would need revisiting** before any
meaningful growth, and it is the first thing to change if this project outlives its POC scope.

## If performance testing ever becomes relevant

It would mean NFR-4 has changed, which would mean revisiting Requirements Analysis rather than
starting here. The likely first bottlenecks, from the code as written:

1. `countAcceptedByRideIds` - the application-side count above
2. The accepted-pair RLS policy's `exists` subquery, evaluated per profile row read
3. The per-ride request resolution in My Rides, which is batched but still fans out per ride
