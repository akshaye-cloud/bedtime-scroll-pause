# Alarm update
- [x] Add ocean-wave audio and supported-device vibration with cleanup.
- [x] Persist two-minute unanswered prompt and eight-minute automatic snooze timing.
- [x] Test timing rules and verify the complete repeating alarm flow.

# Inactivity auto-stop
- [x] Track taps and typing within Pause without resetting inactivity on refresh.
- [x] Stop and save once sleep time is reached and Pause has been inactive for one hour, with a clear recorded reason.
- [x] Test timing boundaries and verify activity, automatic stop, and saved results.

# Sleep-time change rule
- [x] Let demo2–15 change the sleep time anytime while it is more than 1 hour away; never save a time 1 hour away or less (demo1 exempt from the 1-hour rule).
- [x] Re-plan today's recorded stops whenever the sleep time is saved or a session starts, so Progress never shows an outdated planned time; earlier days keep the plan they ran with.
- [x] Test the re-planning rule and verify the cloud copy updates.

# Home date line
- [x] Show today's full date (e.g. Sunday, 25 October 2026) above the sleep time, rolling to the next date each day.
- [x] Test the date format and the rollover to the following day.

# Continue prompt audio
- [x] Play the sea-wave alarm on both continue prompts, before and after the sleep time, with cleanup.
- [x] Browser-verify audio and vibration on each variant.

# Auto-stop timestamp cap
- [x] Cap new inactivity records at two minutes after bedtime without changing manual stops.
- [x] Verify overnight reopening records +2 minutes and run timing tests.

# Stopped-time history
- [x] Add green, amber, and red stopped times in both Progress views.
- [x] Wait one hour for inactivity, show Inactive, and preserve the timestamp cap.
- [x] Test boundaries and verify saved history.