# 📱 UP Bikeshare — Complete SMS Communication Scenarios & Protocol Reference

This document provides an exhaustive, comprehensive reference ("walang labis, walang kulang") of **every SMS communication scenario** in the UP Bikeshare System. It covers all user-initiated SMS commands, edge cases, error validations, security checks, and automated system triggers (cron jobs).

---

## 📋 Table of Contents
1. [System Authentication & Fallbacks](#1-system-authentication--fallbacks)
2. [Core Ride Lifecycle (Borrow ➔ Done ➔ Handshake)](#2-core-ride-lifecycle-borrow--done--handshake)
3. [Maintenance, Damage & Dispute Reporting](#3-maintenance-damage--dispute-reporting)
4. [Inquiries & Information Commands](#4-inquiries--information-commands)
5. [Automated System Notifications (Cron Jobs & Penalties)](#5-automated-system-notifications-cron-jobs--penalties)
6. [Summary of Trust Point Adjustments via SMS](#6-summary-of-trust-point-adjustments-via-sms)

---

## 1. System Authentication & Fallbacks
All incoming SMS messages are intercepted by the Gateway and verified against the registered `members` database before any business logic is executed.

### Scenario 1.1: Non-Registered Sender
* **Condition:** A phone number not registered in the system (or deactivated) texts any command to the Gateway.
* **User SMS Input:** `any text` / `1 eee to vinzons` / `bikeshare help`
* **System Action:** Rejects the request, logs the attempt under `non_registered_senders` and `Logs`, and sends a rejection notice.
* **System SMS Reply:**
  > `"Sorry, you are not registered with UP Bike Share."`
  *(Note: This identical reply is also returned if a non-registered user attempts specific commands like `/borrow`, `/done`, `/points`, etc.)*

### Scenario 1.2: Registered Member Sending Invalid / Unrecognized Command
* **Condition:** An active registered member texts a syntax that does not match any valid command regex pattern.
* **User SMS Input:** `hello` / `borrow bike` / `check availability`
* **System Action:** Intercepted by `fallbackController.js`, logs the attempt under `invalid_command_senders` and `Logs`.
* **System SMS Reply:**
  > `"Invalid Command. Send "bikeshare help" for list of available commands."`

### Scenario 1.3: Suspended Account Attempting to Borrow
* **Condition:** A member whose account status is currently marked as suspended tries to borrow a bike.
* **User SMS Input:** `1 eee to vinzons`
* **System Action:** Rejects the checkout transaction.
* **System SMS Reply:**
  > `"Account suspended."`

### Scenario 1.4: Frozen Account (Due to Dispute) Attempting to Borrow
* **Condition:** A member whose account is frozen due to an ongoing bike damage/missing dispute tries to borrow a bike.
* **User SMS Input:** `1 eee to vinzons`
* **System Action:** Rejects the checkout transaction to prevent further system usage until admin resolution.
* **System SMS Reply:**
  > `"Account frozen due to dispute."`

---

## 2. Core Ride Lifecycle (Borrow ➔ Done ➔ Handshake)
This section outlines the primary workflow when checking out a bike, riding it, and returning it.

### Scenario 2.1: Successful Bike Checkout (`borrow`)
* **Condition:** Active member with good standing borrows an available bike from a valid station to another valid station.
* **User SMS Pattern:** `<code> <from> to <to>` (e.g., `1 eee to vinzons`)
* **System Action:** Validates stations and bike availability, retrieves bike's combination lock code, updates bike status to `Borrowed`, sets location to destination, creates a `bicycle_history` record, and starts the ride timer.
* **System SMS Reply:**
  > `"Hi [Firstname]! Bike [Code] lock code: [LockCode]. Proceed to [Destination]. Remember to lock it & reply 'DONE [Code]' when finished. Safe ride!"`
  *(Example: `"Hi Juan! Bike 1 lock code: 4321. Proceed to vinzons. Remember to lock it & reply 'DONE 1' when finished. Safe ride!"`)*

### Scenario 2.2: Borrowing When User Has an Active Trip
* **Condition:** Member already has an ongoing checked-out bike and tries to borrow a second bike.
* **User SMS Input:** `2 eee to chk`
* **System Action:** Blocks the borrow attempt (1 bike per user policy).
* **System SMS Reply:**
  > `"You already have an active bike checked out. Please return it and text 'done' before borrowing another."`

### Scenario 2.3: Borrowing When User Has a Pending Return Handshake
* **Condition:** Member already texted `done` for a previous ride, but has not yet confirmed condition (`good` or `broken`). They attempt to borrow a new bike.
* **User SMS Input:** `3 palma to engg`
* **System Action:** Forces the user to complete the handshake first.
* **System SMS Reply:**
  > `"You have a pending return confirmation for Bike [Code]. Please reply 'GOOD [Code]' or 'BROKEN [Code]' first before checking out another bike."`

### Scenario 2.4: Borrowing an Unavailable / Parked-Out Bike
* **Condition:** The requested bike code is currently `Borrowed`, `In_Repair`, `Missing`, or `Pending_Status` by someone else.
* **User SMS Input:** `1 eee to vinzons`
* **System Action:** Rejects borrow attempt.
* **System SMS Reply:**
  > `"Bike unavailable."`

### Scenario 2.5A: Borrowing with Non-Existent / Invalid Bike Code
* **Condition:** User attempts to borrow using a bicycle code that does not exist or is inactive in the database (even if station names are valid, e.g., `999 eee to vinzons`).
* **User SMS Input:** `999 eee to vinzons` / `999 xxx to yyy`
* **System Action:** Bicycle check fails at Step 1. Rejects checkout immediately without checking locations.
* **System SMS Reply:**
  > `"Bike [Code] not found or inactive."`

### Scenario 2.5B: Borrowing with Valid Bike Code but Invalid / Offline Station Name
* **Condition:** The requested bike code is valid and available, but either origin or destination station name is invalid, misspelled, or offline (e.g., `1 xxx to yyy` or `1 eee to mars`).
* **User SMS Input:** `1 xxx to yyy`
* **System Action:** Bicycle check passes, but location validation fails at Step 2. Rejects checkout.
* **System SMS Reply:**
  > `"One or both locations are invalid, offline, or unavailable at the moment."`

### Scenario 2.6: Ending Trip Successfully (`done`)
* **Condition:** Active borrower texts `done` to end their trip and lock the bike.
* **User SMS Pattern:** `done <code>` or `<code> done` (e.g., `done 1` / `1 done`)
* **System Action:** Marks `done_text_received = 1`, records timestamp, updates bike status to `Pending_Status`, and prompts the mandatory return condition check.
* **System SMS Reply (<160 chars Single SMS):**
  > `"Trip ended for Bike [Code]. Reply 'GOOD [Code]' or 'BROKEN [Code]'. Save a photo on your phone as local proof (do not send)."`

### Scenario 2.7: Ending Trip for Non-Existent Bike
* **Condition:** User texts `done` for a bicycle code that doesn't exist in the database.
* **User SMS Input:** `done 999`
* **System Action:** Aborts operation.
* **System SMS Reply:**
  > `"Bike [Code] not found."`

### Scenario 2.8: Ending Trip for a Bike Not Currently Borrowed
* **Condition:** User texts `done` for a bike whose status is already `Good`, `In_Repair`, or `Missing`.
* **User SMS Input:** `done 1`
* **System Action:** Aborts operation.
* **System SMS Reply:**
  > `"Bike [Code] is not currently borrowed."`

### Scenario 2.9: Ending Trip for a Bike Borrowed by Someone Else
* **Condition:** Member texts `done` for a bike currently checked out by a *different* student.
* **User SMS Input:** `done 5`
* **System Action:** Blocks unauthorized end-trip attempt.
* **System SMS Reply:**
  > `"You do not have an active borrow for Bike [Code]."`

### Scenario 2.10: Ending Trip When Already in Pending Status
* **Condition:** User texts `done` again after already sending `done` earlier.
* **User SMS Input:** `done 1`
* **System Action:** Reminds the user to send the handshake confirmation instead.
* **System SMS Reply:**
  > `"Trip for Bike [Code] has already been ended. Please reply 'GOOD [Code]' or 'BROKEN [Code]'."`

### Scenario 2.11: Confirming Good Condition (`good`) — Normal (Rides 1 to 4 in Streak)
* **Condition:** Borrower (or next user) confirms the bike is in good working condition during the `Pending_Status` handshake.
* **User SMS Pattern:** `good <code>` or `<code> good` (e.g., `good 1` / `1 good`)
* **System Action:** Finalizes trip (`condition_confirmed = 1`), changes bike status to `Good`, and increments user's `consecutive_good_rides` streak counter towards the milestone reward.
* **System SMS Reply:**
  > `"Thank you! Bike [Code] condition confirmed as Good."`

### Scenario 2.12: Confirming Good Condition (`good`) — Milestone Bonus! 🎉 (Every 5th Ride)
* **Condition:** Borrower confirms good condition and hits a consistent riding milestone (every 5th consecutive good ride: 5, 10, 15, 20...).
* **User SMS Input:** `good 1`
* **System Action:** Finalizes trip, changes bike status to `Good`, AND awards a milestone bonus of **+5 Trust Points & +5 Leaderboard Points**!
* **System SMS Reply:**
  > `"Thank you! Bike [Code] condition confirmed as Good. Congratulations! You earned +5 bonus points for completing 5 consecutive clean rides without disputes!"`

### Scenario 2.13: Confirming Good Condition When Bike Not Awaiting Check
* **Condition:** User texts `good` for a bike that is already `Good`, `Borrowed`, or `In_Repair` (not in `Pending_Status`).
* **User SMS Input:** `good 1`
* **System Action:** Aborts confirmation.
* **System SMS Reply:**
  > `"Bike [Code] is not awaiting a condition check."`

### Scenario 2.14: Unauthorized User Attempting to Confirm Condition
* **Condition:** A member who is *not* the recent borrower (nor the next user inspecting it) tries to reply `good` or `broken` for a pending bike.
* **User SMS Input:** `good 1`
* **System Action:** Blocks confirmation.
* **System SMS Reply:**
  > `"You are not the borrower of Bike [Code] awaiting confirmation."`

---

## 3. Maintenance, Damage & Dispute Reporting
Protocols for handling broken bicycles, missing bikes, disputes between consecutive users, and delivering bikes to repair hubs.

### Scenario 3.1: Borrower Reporting Bike Broken During Handshake (`broken`)
* **Condition:** Active borrower replies `broken` instead of `good` after ending their trip.
* **User SMS Pattern:** `broken <code>` or `<code> broken` (e.g., `broken 1` / `1 broken`)
* **System Action:** Finalizes trip with condition `Broken`, updates bike status to `Broken`, resets borrower's `consecutive_good_rides` counter to 0, and applies a **−2 Trust Points demerit**.
* **System SMS Reply:**
  > `"Thank you for reporting. Please lock and leave Bike [Code] at the designated UPBS Hub (or current location) for the maintenance team to collect."`

### Scenario 3.2: Next User Reporting Bike Broken at Checkout (Dispute Protocol)
* **Condition:** A bike is marked as `Good` at a station, but the *next* intending rider finds it damaged before borrowing and texts `broken`.
* **User SMS Input:** `broken 1`
* **System Action:** Triggers Dispute Protocol. Flags bike status to `Disputed` (or `In_Repair`), freezes the *previous* borrower's account pending admin review, resets previous user's streak, and applies a **−5 Trust Points penalty** to the previous borrower for leaving unreported damage.
* **System SMS Reply (To Reporter):**
  > `"Thank you for reporting. Bike [Code] is marked as Disputed for admin review. You will be rewarded trust points if this is verified."`

### Scenario 3.3: Reporting Broken on an Already Disputed or Under-Repair Bike
* **Condition:** User texts `broken` for a bike that is already undergoing maintenance or admin dispute review.
* **User SMS Input:** `broken 1`
* **System Action:** Prevents duplicate reports.
* **System SMS Replies (Depending on current state):**
  * If already in dispute: > `"Bike [Code] is already disputed for admin review."`
  * If already broken: > `"Bike [Code] is already reported broken and undergoing repairs."`
  * If already delivered to hub: > `"Bike [Code] is currently reported as delivered and undergoing repairs."`

### Scenario 3.4: Reporting Broken When Bike is Currently Checked Out by Someone Else
* **Condition:** Member texts `broken` for a bike currently being actively ridden (`Borrowed`) by another user.
* **User SMS Input:** `broken 5`
* **System Action:** Rejects report to prevent griefing active riders.
* **System SMS Reply:**
  > `"Bike [Code] is currently checked out by another member."`

### Scenario 3.5: Delivering a Broken Bike to a Hub for Repair (`delivered`)
* **Condition:** Member delivers a broken/maintenance bike to a designated station or maintenance hub to be serviced by tech crew.
* **User SMS Pattern:** `delivered <code> <location>` or `<code> delivered <location>` (e.g., `delivered 1 engg` / `1 delivered vinzons`)
* **System Action:** Updates bike status to `Broken` (awaiting admin pickup), sets location to the delivery hub, and logs the delivery. Awards **+5 Trust Points & +5 Leaderboard Points** to community volunteers who transport the bike. *(Note: If the deliverer is the borrower who broke/used it during the trip, 0 bonus reward points are awarded since returning it is their standard borrower duty).*
* **System SMS Reply (If Volunteer):**
  > `"Thank you! Bike [Code] has been delivered to [LOCATION] and marked as Broken. As a volunteer transport, you have been rewarded +5 trust points!"`
* **System SMS Reply (If Borrower who broke it):**
  > `"Thank you! Bike [Code] has been delivered to [LOCATION] and marked as Broken. An admin will collect it for repair."`

### Scenario 3.6: Delivering Without Specifying Location
* **Condition:** User texts `delivered 1` but forgets to include the station/hub name.
* **User SMS Input:** `delivered 1`
* **System Action:** Prompts user for location format.
* **System SMS Reply:**
  > `"Please specify the station where you delivered Bike [Code]. Example: delivered [Code] engg"`

### Scenario 3.7: Delivering to an Invalid / Offline Station
* **Condition:** User specifies a location name that does not exist or is disabled in the database.
* **User SMS Input:** `delivered 1 mars`
* **System Action:** Aborts delivery log.
* **System SMS Reply:**
  > `"Location 'mars' is not valid or currently offline."`

### Scenario 3.8: Delivering a Bike Currently in Admin Dispute
* **Condition:** User tries to deliver a bike whose status is `Disputed`.
* **User SMS Input:** `delivered 1 engg`
* **System Action:** Blocks delivery until admin resolves the dispute liability.
* **System SMS Reply:**
  > `"Bike [Code] is currently disputed and can only be resolved by an administrator."`

### Scenario 3.9: Reporting a Missing Bicycle (`missing`)
* **Condition:** Member spots that a bike is missing from its designated station and texts `missing`.
* **User SMS Pattern:** `missing <code>` or `<code> missing` (e.g., `missing 1` / `1 missing`)
* **System Action:** Flags bike status to `Missing`, freezes the last known borrower's account for investigation, and queues a **+5 Trust Points reward** for the honest reporter upon verification.
* **System SMS Reply:**
  > `"Thank you for reporting. Bike [Code] is marked as Missing for admin review. You will be rewarded trust points if this is verified."`

### Scenario 3.10: Reporting Missing on an In-Use or Under-Repair Bike
* **Condition:** User reports a bike missing while it is actively borrowed or already in the repair shop.
* **User SMS Input:** `missing 1`
* **System Action:** Blocks invalid missing report.
* **System SMS Replies:**
  * If currently borrowed/pending: > `"Bike [Code] is currently checked out by another member or pending a condition check."`
  * If under repair: > `"Bike [Code] is currently undergoing repairs."`
  * If already missing: > `"Bike [Code] is already reported missing and under investigation."`

---

## 4. Inquiries & Information Commands
Utility commands allowing students to query system status without internet connection.

### Scenario 4.1: Checking Trust Points & Score (`points`)
* **Condition:** Member wants to check their standing in the system.
* **User SMS Pattern:** `points` (exact)
* **System Action:** Queries `trust_points` from `members` table.
* **System SMS Reply:**
  > `"Your current UP Bike Share trust points: [Points]. Keep it up!"`
  *(Example: `"Your current UP Bike Share trust points: 105. Keep it up!"`)*

### Scenario 4.2: Listing Active Stations (`locations`)
* **Condition:** Member queries available bike stations across UP campus.
* **User SMS Pattern:** `locations` (exact)
* **System Action:** Fetches all active, non-disabled stations from `locations` table.
* **System SMS Replies:**
  * If stations exist: > `"Available locations: EEE, ENGG, PALMA_HALL, VINZONS, CHK"`
  * If none active: > `"No locations available at the moment."`

### Scenario 4.3: Searching Bikes at a Specific Station (`search [location]`)
* **Condition:** Member checks which bike codes are currently parked and available at a specific hub.
* **User SMS Pattern:** `search <location>` (e.g., `search eee` / `search vinzons`)
* **System Action:** Queries bikes where `current_location = location` and `condition_status = 'Good'`.
* **System SMS Replies:**
  * If bikes available: > `"Bicycles currently available at eee: Bike 1, Bike 4, Bike 12."`
  * If hub empty: > `"There are no bicycles available at eee at the moment."`

### Scenario 4.4: Searching All Available Bikes (`search all`)
* **Condition:** Member queries campus-wide bike availability.
* **User SMS Pattern:** `search all` (exact)
* **System Action:** Summarizes count of available (`Good`) bikes grouped by station.
* **System SMS Reply:**
  > `"Available bikes across campus:
  > EEE: 3 bikes
  > ENGG: 1 bike
  > PALMA_HALL: 0 bikes
  > VINZONS: 5 bikes
  > 
  > Text 'search [location]' for bike codes."`

### Scenario 4.5: Checking Bicycle Location & Usage (`usage [bike]`)
* **Condition:** Member checks where a specific bike is currently located.
* **User SMS Pattern:** `usage <code>` or `<code> usage` (e.g., `usage 1` / `1 usage`)
* **System Action:** Retrieves current location, condition status, and top 3 recent trips (without broadcasting full student names for privacy). Formats into a single SMS under 160 characters.
* **System SMS Replies:**
  * If found:
    > `"Bike 1 (Good at VINZONS):
    > Recent trips:
    > 1. vinzons->nec (7/2 9:32 AM)
    > 2. engg->vinzons (7/2 7:13 AM)
    > 3. vinzons->engg (7/1 3:31 PM)"`
  * If bike code invalid: > `"Invalid bicycle code 999. Please check and try again."`

### Scenario 4.6: Quick Instructions (`how`)
* **Condition:** Member needs a quick reminder on how to format the checkout command.
* **User SMS Pattern:** `how` (exact)
* **System Action:** Returns quick 3-step system guidelines for borrowing, returning, and reporting issues.
* **System SMS Reply:**
  > `"UPBS Quick Guide:
  > 1. Borrow: 1 eee to vinzons
  > 2. Return: done 1 then 1 good
  > 3. Report issue: broken 1
  > Text 'bikeshare help' for all commands."`

### Scenario 4.7: Full Command Reference (`bikeshare help`)
* **Condition:** Member requests a complete cheat sheet of SMS commands.
* **User SMS Pattern:** `bikeshare help` (exact)
* **System Action:** Sends two sequential SMS parts detailing all available commands.
* **System SMS Reply (Part 1 of 2):**
  > `"UPBS Help (1/2):
Flow: Search-Borrow-Done-Report
- search all
- search [location]
- [bike] [from] to [to] (e.g. 1 eee to vinzons)
- done [bike]
- [bike] good/broken/missing/delivered"`
* **System SMS Reply (Part 2 of 2):**
  > `"UPBS Help (2/2):
Other commands:
- points
- locations
- usage [bike]
- search [bike]
- how"`

---

## 5. Automated System Notifications (Cron Jobs & Penalties)
Background timers continuously monitor active rides, pending handshakes, and repair grace periods, dispatching automated SMS alerts when rules are triggered.

### Scenario 5.1: 1-Hour Active Ride Reminder
* **Condition:** A bike has been checked out (`Borrowed`) for exactly 1 hour.
* **Trigger:** Hourly cron job (`cronJobs.js`).
* **System Action:** Sets `reminder_1h_sent = 1` and dispatches a friendly check-in SMS.
* **System SMS Reply (Automated):**
  > `"Hope you're enjoying the ride! Remember to text 'done [Code]' when finished."`

### Scenario 5.2: Dynamic Overtime Warning Reminder
* **Condition:** A ride approaches the configured maximum borrow limit (e.g., at the configured threshold hour).
* **Trigger:** Hourly cron job.
* **System Action:** Calculates remaining hours before overtime demerits apply and warns the rider.
* **System SMS Reply (Automated):**
  > `"Reminder: You have [HoursLeft] hour(s) left on Bike [Code]. Please return it to a station soon. Remember to text 'done [Code]' when finished."`

### Scenario 5.3: Overtime Limit Exceeded Penalty Alert
* **Condition:** A ride exceeds the maximum allowed borrow duration (e.g., > 2 hours or configured limit).
* **Trigger:** Hourly cron job.
* **System Action:** Applies dynamic overtime penalty (e.g., **−3 Trust Points**), records timestamp, and warns that deductions will continue hourly until returned.
* **System SMS Reply (Automated):**
  > `"ALERT: You have exceeded the borrow time limit for Bike [Code]. A -3 point penalty has been applied. You will continue to lose 3 points EVERY HOUR until the bike is returned."`

### Scenario 5.4: 5-Minute Handshake Photo Proof Reminder
* **Condition:** User texted `done`, but 5 minutes have elapsed without sending `good` or `broken` confirmation.
* **Trigger:** Cron job running every 2 minutes.
* **System Action:** Sets `reminder_pending_sent = 1` and sends reminder to finalize handshake and keep local photo proof.
* **System SMS Reply (<160 chars Single SMS - Automated):**
  > `"Reminder: Confirm condition for Bike [Code]. Reply 'GOOD [Code]' or 'BROKEN [Code]'. Save a photo on your phone as local proof (do not send)."`

### Scenario 5.5: Handshake Timeout Auto-Finalize & Penalty
* **Condition:** A bike remains in `Pending_Status` without confirmation for longer than `handshake_timeout_mins` (default: 30 mins).
* **Trigger:** Cron job running every 5 minutes.
* **System Action:** Auto-finalizes trip (`condition_confirmed = 1`, `reported_condition = 'Timeout'`), reverts bike status to `Good`, applies abandoned handshake penalty (default: **−2 Trust Points**), and alerts user.
* **System SMS Reply (Automated):**
  > `"ALERT: You failed to confirm the condition of Bike [Code] within 30 minutes. Your trip has been auto-completed, and a -2 point penalty has been applied to your account."`

---

## 6. Summary of Trust Point Adjustments via SMS
Below is the complete ledger of how SMS actions directly impact a student's Trust Score and Leaderboard standing:

| Action / Event | SMS Command / Trigger | Trust Points | Leaderboard Points | Streak Counter (`consecutive_good_rides`) |
| :--- | :--- | :---: | :---: | :---: |
| **Normal Good Return** | `good <code>` | **+1** | **+1** | +1 |
| **Consistent Rider Bonus** | Every 5th `good <code>` | **+5** (Bonus) | **+5** (Bonus) | Continues counting |
| **Community Volunteer** | `delivered <code> <loc>` | **+5** | **+5** | Unchanged |
| **Honest Missing Report** | `missing <code>` (Verified) | **+5** | **+0** | Unchanged |
| **Reported Broken by Borrower**| `broken <code>` (Handshake) | **−2** | **+0** | **Reset to 0** |
| **Abandoned Handshake** | *30-Min Cron Timeout* | **−2** | **−2** | Unchanged |
| **Overtime Ride Penalty** | *Hourly Cron Expiry* | **−3** / hr | **+0** | Unchanged |
| **Unreported Damage (Dispute)**| `broken <code>` by Next Rider | **−5** | **+0** | **Reset to 0** |
| **False Emergency Report** | *Admin Audit* | **−5** | **+0** | **Reset to 0** |
