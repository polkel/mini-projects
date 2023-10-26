# monthly-budget-reporting
This is a script that pairs up with a Google Spreadsheet linked with a Google Form that asks for discretionary expenses you make (name, category, amount).

The form and the spreadsheet have to be setup manually at first, but will then update itself automatically every month. You can set the productionScript function to a trigger as often as you'd like and it will send emails to the user on their monthly spending. It will give information on their remaining monthly balance, weekly discretionary spending rate, end of month projection, and all time balance (combining all months that this has been used).

Currently, for all time balance calculation to work correctly, the first month must either be started at the beginning of the month or expenses have to be backfilled.
