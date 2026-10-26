# Alarm update
- [x] Add ocean-wave audio and supported-device vibration with cleanup.
- [x] Persist two-minute unanswered prompt and eight-minute automatic snooze timing.
- [x] Test timing rules and verify the complete repeating alarm flow.

# Inactivity auto-stop
- [x] Track taps and typing within Pause without resetting inactivity on refresh.
- [x] Stop and save after sleep time and two inactive minutes, with a clear recorded reason.
- [x] Test timing boundaries and verify activity, automatic stop, and saved results.

# Daily sleep-time lock
- [x] Lock the saved sleep time for the rest of the day, per account (demo1 exempt for testing).
- [x] Browser-verify locked state on a demo account and exemption on demo1.

# Home date line
- [x] Show today's full date (e.g. Sunday, 25 October 2026) above the sleep time, rolling to the next date each day.
- [x] Test the date format and the rollover to the following day.

# Continue prompt audio
- [x] Play the sea-wave alarm on both continue prompts, before and after the sleep time, with cleanup.
- [x] Browser-verify audio and vibration on each variant.

# Auto-stop timestamp cap
- [x] Cap new inactivity records at two minutes after bedtime without changing manual stops.
- [x] Verify overnight reopening records +2 minutes and run timing tests.