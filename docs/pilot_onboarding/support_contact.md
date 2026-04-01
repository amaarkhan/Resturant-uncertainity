# Support Contact and Escalation Matrix

If something breaks, or if the Pilot testers ask what to do if the application crashes, use this standardized support routing tree.

## Priority Tiers
1. **Critical Function Failure (P0):** The API is entirely down, or the Kitchen Dashboard returns a `500 Server Error`.
2. **Algorithm Anomaly (P1):** The AI outputs `0` recommendations, or the System Trust Score tanks dramatically due to horrific mathematical miscalculation.
3. **Data Parity Issue (P2):** Weather isn't pulling correctly, or Admin dashboard stats look incorrect.

## Standard Support Flow
**Owner Encounters Issue -> Owner Logs Fallback -> Owner Calls Support.**

If OpenMeteo weather integrations drop out, the app silently falls back to *Baseline Estimates* and triggers the `Used Fallback = true` flag in the DB. This marks a `"Low"` confidence level on the Owner app. **They should continue working as normal using baseline quotas.**

### Contact Channels
* **Email Support:** `support@restaurant-uncertainty.aip`
  *(Please include the exact Menu Item and the explicit date if reporting a calculation fault!)*
* **Emergency Ping:** Use the internal MVP Slack/Discord channels citing `#pilot-engine-failure`.

## Escalation for Administrators
If a **P0** is reported:
1. SSH to the deployment box, check `pm2 logs api`.
2. Review Prisma Error tracing (`npx prisma studio` optionally).
3. If SQLite is locked natively, reboot the background node processes.
4. Notify users via WhatsApp Broadcast.
