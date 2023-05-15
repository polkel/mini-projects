function testFunction() {
  let SS_ID = "PLACE SPREADSHEET ID HERE";
  let ss = SpreadsheetApp.openById(SS_ID);
}


function productionScript() {
  let SS_ID = "PLACE SPREADSHEET ID HERE";
  let ss = SpreadsheetApp.openById(SS_ID);
  let formSheet = new FormSheet(ss);
  let recentExpenses = formSheet.getExpenses();
  if (recentExpenses.length > 0) {
    addExpenses(ss, recentExpenses);
  }
  let emailHelper = new EmailHelper(ss, recentExpenses);
  emailHelper.sendEmail();
  formSheet.deleteExpenses();
}

// TODO Refactor so that only one instance of each sheet class is created for efficiency
