# Scheduling Utilities
This directory contains utilities for cron parsing, scheduling intervals, and recurring logic.

## Exported Functions
- `nextCron` / `prevCron`: Evaluates zero-dependency cron expressions to find the next or previous matching date.
- `Interval`: Advanced recurring scheduling loop with precision drift-correction.
