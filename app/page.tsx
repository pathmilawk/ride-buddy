import { redirect } from "next/navigation";

/**
 * Entry point.
 *
 * The middleware has already decided whether there is a session (BR-1.6): a signed-out
 * visitor never reaches this file, and a signed-in one is sent onward here.
 *
 * Unit 2 changed the destination from /profile to /search - finding a ride is the thing an
 * employee opens the app to do, and the completeness gate will divert them to their profile
 * if anything is missing (BR-2.1).
 */
export default function HomePage() {
  redirect("/search");
}
