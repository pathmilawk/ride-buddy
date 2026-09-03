# Ride Buddy - Product Vision

## 1. Overview

Build a simple internal carpooling application for office employees.

The application allows employees to:

- Offer a ride to coworkers.
- Find available rides.
- Request a seat.
- Accept or reject ride requests.
- See basic contact details after a request is accepted.

The product is intended as a small Proof of Concept (POC), not a production-grade ride-sharing platform.

The MVP must be simple enough to build and deploy within approximately 4 hours using Claude Code.

---

## 2. Target Users

The application is only for employees of the company.

There are two main user types:

### Driver

An employee who has a car and wants to offer available seats to coworkers.

### Passenger

An employee who wants to find and join a ride offered by another employee.

An employee can be both a driver and a passenger.

---

## 3. Core Problem

Office employees often travel to and from the office from similar areas.

The application should make it easy for coworkers to discover existing rides rather than travelling separately.

The MVP focuses on one simple use case:

> An employee going to the office can offer spare seats in their car, and another employee travelling from the same area can request a seat.

---

## 4. MVP Scope

The MVP supports:

### Authentication

Employees sign in using their company email address.

Only company employees should be able to use the application.

For the POC, company email verification is sufficient.

---

### User Profile

Each user has:

- Name
- Company email
- Phone number
- Home / pickup area
- Role:
    - Driver
    - Passenger
    - Both

Users should be able to update their profile.

---

### Create a Ride

A driver can create a ride with:

- Date
- Departure time
- Pickup area
- Destination
- Available seats

The primary use case is:

```text
Home / pickup area → Office