# Administrator Operations Checklist

As a Platform Admin taking on a new Restaurant for the MVP, you must configure their initial database entry and ensure the external signals correctly pull relevant geographic logic.

## 🛠️ Onboarding a New Pilot 

**Step 1. Access the Admin Portal**
- Navigate to `http://...:5174/` and authenticate using `admin@example.com`.
- Head to the **Restaurants Config** tab.

**Step 2. Initial Configuration Setup**
- [ ] Ensure the Restaurant Profile exists (Add them to the system if not).
- [ ] Determine their `Operating Days CSV` (e.g. `Mon,Tue,Wed,Thu,Fri,Sat,Sun`) so the system accurately penalizes missing inputs.
- [ ] Open the **Settings Panel** for their profile.

**Step 3. Tweak the Recommendation Sensitivities**
- **Weather Feed Validation:** Does this venue experience 15% drops in traffic during heavy rain? Set the toggle to **Active** and input a `Weather Override Weight` of `1.0`. (For indoor food courts, maybe tone it down to `0.4`).
- **Local Event Sync:** Does this venue sit near stadium grounds or university halls? Engage the **Event Impact Weight** to properly capture mock cricket/exam surges.

**Step 4. Stocking the Global Menu Base**
- Access the **Global Menu Base** tab.
- Submit each item with an initial baseline prep quantity.
- **IMPORTANT:** Include standard Cost and Pricing logic so our MVP Telemetry can track Platform Gross Margin improvements over Phase 8.

## 📊 Monitoring Pilot Health

Every 4 days, navigate to the **MVP Telemetry** tab mapping live data integrity:
- Is their **Feedback Completion Loop** below `50%`? They are forgetting to use the app in the evening!
- Is the **Missing Input Defaults** ticking upwards? The external APIs (OpenMeteo) may be failing to geolocate. Check backend logs.
- Is **Stockout Occurrences** hovering above 5%? The algorithm weights need to be adjusted higher for their Baseline Prep Quotas!
