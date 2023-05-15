class Expense{
  constructor({date, name, type, amount}){
    this.name = name;
    this.date = date;
    this.type = type;
    this.amount = parseFloat(amount).toFixed(2);  // this is a string!
  }
}


class EmailHelper{
  constructor(ss, recentExpenses){
    this.ss = ss;
    this.now = new Date();
    this.currMonthSheet = new MonthlyExpenseSheet(this.ss, this.now);
    this.allExpenseSheet = new AllExpenseSheet(this.ss);
    this.RECIPIENTS = "ENTER EMAILS HERE";
    this.SUBJECT = `Budget Report - ${Utilities.formatDate(this.now, "US/Eastern", "LLLL-dd-yyyy")}`;
    this.recentExpenses = recentExpenses;
    if (recentExpenses.length != 0) {
      sortExpenseList(this.recentExpenses);  
    }
  }

  createMonthMetrics() {
    let remaining = parseFloat(this.currMonthSheet.getSheetRemaining());
    let weeklyRate = parseFloat(this.currMonthSheet.getSheetWeekly());
    let eomProjection = parseFloat(this.currMonthSheet.getSheetEOM());
    let allTime = parseFloat(this.currMonthSheet.getSheetAllTime());
    let remainingString = remaining.toFixed(2);
    let eomString = eomProjection.toFixed(2);
    let allTimeString = allTime.toFixed(2);
    if (remaining < 0) {
      remainingString = `(${-1 * remaining.toFixed(2)})`;
    }
    if (eomProjection < 0) {
      eomString = `(${-1 * eomProjection.toFixed(2)})`;
    }
    if (allTime < 0) {
      allTimeString = `(${-1 * allTime.toFixed(2)})`;
    }
    let weeklyString = weeklyRate.toFixed(2);
    let email = `Hello,\n\nHere is your regular spending report for ${this.currMonthSheet.name}:\n\n`;
    email += `Your remaining budget is $ ${remainingString}.\n`;
    email += `Your weekly spending rate is $ ${weeklyString}.\n`;
    email += `Your end-of-month balance projection is $ ${eomString}.\n`;
    email += `Your all time balance is $ ${allTimeString}.\n\n`;
    return email;
  }

  createRecentExpenses() {
    if (this.recentExpenses.length == 0) {
      return "";
    }
    let email = "Here are your recent expenses:\n\n";
    for (let expense of this.recentExpenses) {
      email += `${expense["name"]} - ${expense["type"]} - $ ${parseFloat(expense["amount"]).toFixed(2)}\n`;
    }
    email += "\n";
    return email;
  }

  createMonthlyCategory() {
    let email = "Here is your spending by category this month:\n\n";
    let monthExpenseList = this.currMonthSheet.getAllExpenses();
    let categoryDict = getSumTypes(monthExpenseList);
    let categoryList = Object.keys(categoryDict);
    categoryList.sort((a, b) => parseFloat(categoryDict[b]) - parseFloat(categoryDict[a]));
    for (let category of categoryList) {
      if (category === "Recurring") {
        continue;
      }
      email += `${category} - $ ${parseFloat(categoryDict[category]).toFixed(2)}\n`;
    }
    email += "\n";
    return email;
  }

  createWeeklyCategory() {
    let today = this.now.getDay();
    let startAdjustment = -today;
    let endAdjustment = 7 - today;
    let startDate = new Date(this.now);
    let endDate = new Date(this.now);
    startDate.setDate(startDate.getDate() + startAdjustment);
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    endDate.setDate(endDate.getDate() + endAdjustment);
    endDate.setHours(0);
    endDate.setMinutes(0);
    endDate.setSeconds(0);
    let expensesWeekly = this.allExpenseSheet.getExpensesWithinDates(startDate, endDate);
    if (expensesWeekly.length == 0) {
      return "";
    }
    let email = "Here is your spending by category this week:\n\n";
    let categoryDict = getSumTypes(expensesWeekly);
    let categoryList = Object.keys(categoryDict);
    categoryList.sort((a, b) => parseFloat(categoryDict[b]) - parseFloat(categoryDict[a]));
    for (let category of categoryList) {
      if (category === "Recurring") {
        continue;
      }
      email += `${category} - $ ${parseFloat(categoryDict[category]).toFixed(2)}\n`;
    }
    email += "\n";
    return email;
  }

  createSignOff() {
    return "Thanks!\nGoogle :)";
  }

  sendEmail() {
    let email = this.createMonthMetrics();
    email += this.createRecentExpenses();
    email += this.createWeeklyCategory();
    email += this.createMonthlyCategory();
    email += this.createSignOff();
    MailApp.sendEmail(this.RECIPIENTS, this.SUBJECT, email);
  }
}


class MonthlyExpenseSheet{
  constructor(ss, date) {
    this.ss = ss;
    this.now = new Date();
    this.date = date;
    this.name = Utilities.formatDate(date, "US/Eastern", "LLLL yyyy")
    this.INCOME = 4360.94;
    this.header = ["Monthly Income", "Monthly Remaining", "Weekly Rate", "EOM Projection", "Balance All-Time"];
    this.HEADER_ROW = 1;
    this.EXPENSE_HEADER_ROW = 3;
    this.INCOME_CELL = "A2";
    this.REMAINING_CELL = "B2";
    this.WEEKLY_CELL = "C2";
    this.EOM_CELL = "D2";
    this.ALL_TIME_CELL = "E2";
    this.DATE_COL = 1;
    this.NAME_COL = 2;
    this.TYPE_COL = 3;
    this.AMOUNT_COL = 4;
    this.DATE_IND = 0;
    this.NAME_IND = 1;
    this.TYPE_IND = 2;
    this.AMOUNT_IND = 3;
    this.AMOUNT_FORMAT = "0.00";
    this.DATE_FORMAT = "m-d-yy h:mm am/pm";
    this.expenseHeader = ["Date", "Expense Name","Expense Type", "Expense Amount ($)"];
    this.sheet = this.ss.getSheetByName(this.name);
    if (this.sheet == null) {
      this.sheet = this.createSheet();
    }
    this.lastRow = this.sheet.getLastRow();
    this.calculateMetrics();
  }

  createSheet(){
    let sheet = this.ss.insertSheet(this.name, 2);
    let headerRange = sheet.getRange(this.HEADER_ROW, 1, 1, this.header.length);
    headerRange.setValues([this.header]);
    headerRange.setFontWeight("bold");
    let expenseHeaderRange = sheet.getRange(this.EXPENSE_HEADER_ROW, 1, 1, this.expenseHeader.length);
    expenseHeaderRange.setValues([this.expenseHeader]);
    expenseHeaderRange.setFontWeight("bold");
    let recurringSheet = new RecurringSheet(this.ss);
    let recurringList = recurringSheet.getRecurringExpenses(this.date);
    let recurringValues = createExpenseMatrix(recurringList);
    let recurringRange = sheet.getRange(this.EXPENSE_HEADER_ROW + 1, 1, recurringValues.length, this.expenseHeader.length);
    recurringRange.setValues(recurringValues);
    return sheet;
  }

  calculateMetrics() {
    this.sheet.getRange(this.INCOME_CELL).setValue(this.INCOME);
    let allExpenseList = this.getAllExpenses();
    this.sheet.getRange(this.REMAINING_CELL).setValue(this.INCOME - this.getExpenseSum(allExpenseList));
    this.sheet.getRange(this.WEEKLY_CELL).setValue(this.getWeeklyRate(allExpenseList));
    this.sheet.getRange(this.EOM_CELL).setValue(this.getEOMProjection());
    this.sheet.getRange(this.ALL_TIME_CELL).setValue(this.getAllTime());
    this.adjustFormats(this.DATE_FORMAT, this.AMOUNT_FORMAT);
  }

  adjustFormats(dateFormatString, amountFormatString) {
    let headerNumRange = this.sheet.getRange(this.HEADER_ROW + 1, 1, 1, this.header.length);
    headerNumRange.setNumberFormat(amountFormatString);
    let expenseDateRange = this.sheet.getRange(this.EXPENSE_HEADER_ROW + 1, this.DATE_COL, this.lastRow - this.EXPENSE_HEADER_ROW, 1);
    expenseDateRange.setNumberFormat(this.DATE_FORMAT);
    let expenseAmountRange = this.sheet.getRange(this.EXPENSE_HEADER_ROW + 1, this.AMOUNT_COL, this.lastRow - this.EXPENSE_HEADER_ROW, 1);
    expenseAmountRange.setNumberFormat(this.AMOUNT_FORMAT);
    this.sheet.autoResizeColumns(1, this.header.length);
  }

  getExpenseSum(expenseList) {
    let sum = expenseList.reduce((prev, curr) => prev + parseFloat(curr["amount"]), 0.0);
    return sum;
  }

  getWeeklyRate(expenseList) {
    let discretionaryList = expenseList.filter((expense) => expense["type"] !== "Recurring");
    let sum = this.getExpenseSum(discretionaryList);
    let days;
    if (this.now.getMonth() === this.date.getMonth()) {
      days = this.now.getDate();
    }
    else {
      let dateCopy = new Date(this.date);
      dateCopy.setMonth(dateCopy.getMonth() + 1);
      dateCopy.setDate(0);
      days = dateCopy.getDate();
    }
    let weeklyRate = (sum / days) * 7.0;
    return weeklyRate;
  }

  getEOMProjection() {
    if (this.now.getMonth() !== this.date.getMonth()) {
      return this.sheet.getRange(this.REMAINING_CELL).getValue();
    }
    let dateCopy = new Date(this.now);
    dateCopy.setMonth(dateCopy.getMonth() + 1);
    dateCopy.setDate(0);
    let lastDay = dateCopy.getDate();
    let currDay = this.now.getDate();
    let daysRemaining = lastDay - currDay;
    let weeklyRate = parseFloat(this.getSheetWeekly());
    let weeksRemaining = daysRemaining / 7.0;
    let remainingCost = weeklyRate * weeksRemaining;
    let eomProjection = parseFloat(this.getSheetRemaining()) - remainingCost;
    return eomProjection;
  }

  getAllTime() {
    let dateCopy = new Date(this.date);
    dateCopy.setDate(0);
    let lastSheetName = Utilities.formatDate(dateCopy, "US/Eastern", "LLLL yyyy")
    let lastSheet = this.ss.getSheetByName(lastSheetName);
    if (lastSheet == null) {
      return this.getSheetRemaining();
    }
    else {
      let lastSheet = new MonthlyExpenseSheet(this.ss, dateCopy);
      return parseFloat(this.getSheetRemaining()) + parseFloat(lastSheet.getSheetAllTime());
    }
  }

  getSheetRemaining() {
    return this.sheet.getRange(this.REMAINING_CELL).getValue();
  }

  getSheetWeekly() {
    return this.sheet.getRange(this.WEEKLY_CELL).getValue();
  }

  getSheetEOM() {
    return this.sheet.getRange(this.EOM_CELL).getValue();
  }

  getSheetAllTime() {
    return this.sheet.getRange(this.ALL_TIME_CELL).getValue();
  }

  getAllExpenses() {
    let expensesRange = this.sheet.getRange(this.EXPENSE_HEADER_ROW + 1, 1, this.lastRow - this.EXPENSE_HEADER_ROW, this.expenseHeader.length);
    let expensesValues = expensesRange.getValues();
    let expenseList = [];
    for (let expense of expensesValues) {
      let expenseDict = {
        date: new Date(expense[this.DATE_IND]),
        name: expense[this.NAME_IND],
        type: expense[this.TYPE_IND],
        amount: expense[this.AMOUNT_IND]
      };
      expenseList.push(new Expense(expenseDict));
    }
    return expenseList;
  }

  addExpenses(list) {  // takes in a list of Expense objects
    sortExpenseList(list);
    let expenseMatrix = createExpenseMatrix(list);
    let addRange = this.sheet.getRange(this.lastRow + 1, 1, expenseMatrix.length, this.expenseHeader.length);
    addRange.setValues(expenseMatrix);
    this.lastRow = this.sheet.getLastRow();
    this.calculateMetrics();
  }
}


class AllExpenseSheet{
  constructor(ss) {
    this.ss = ss;
    this.sheet = ss.getSheetByName("All Expenses");
    this.lastRow = this.sheet.getLastRow();
    this.DATE_COLUMN = 1;
    this.DATE_INDEX = 0;
    this.NAME_COLUMN = 2;
    this.NAME_INDEX = 1;
    this.TYPE_COLUMN = 3;
    this.TYPE_INDEX = 2;
    this.AMOUNT_COLUMN = 4;
    this.AMOUNT_INDEX = 3;
    this.DATE_FORMAT = "m-d-yy h:mm am/pm";
    this.AMOUNT_FORMAT = "0.00";
  }

  addExpenses(list) {
    sortExpenseList(list);
    let addRange = this.sheet.getRange(this.lastRow + 1, 1, list.length, this.AMOUNT_COLUMN);
    let expenseMatrix = createExpenseMatrix(list);
    addRange.setValues(expenseMatrix);
    this.lastRow = this.sheet.getLastRow();
    this.adjustFormats(this.DATE_FORMAT, this.AMOUNT_FORMAT);
  }

  adjustFormats(dateFormatString, amountFormatString) {
    let dateRange = this.sheet.getRange(2, this.DATE_COLUMN, this.lastRow - 1, 1);
    let amountRange = this.sheet.getRange(2, this.AMOUNT_COLUMN, this.lastRow - 1, 1);
    dateRange.setNumberFormat(dateFormatString);
    amountRange.setNumberFormat(amountFormatString);
    this.sheet.autoResizeColumns(1, this.AMOUNT_COLUMN);
  }

  getAllExpenses() {
    let expenseRangeValues = this.sheet.getRange(2, 1, this.lastRow - 1, this.AMOUNT_COLUMN).getValues();
    let expenseList = [];
    for (let row of expenseRangeValues) {
      let expenseDict = {
        date: new Date(row[this.DATE_INDEX]),
        name: row[this.NAME_INDEX],
        type: row[this.TYPE_INDEX],
        amount: row[this.AMOUNT_INDEX]
      };
      expenseList.push(new Expense(expenseDict));
    }
    return expenseList;
  }

  getExpensesWithinDates(startDate, endDate) {
    let allExpenses = this.getAllExpenses();
    let withinDate = allExpenses.filter((expense) => expense["date"] >= startDate && expense["date"] <= endDate);
    return withinDate;
  }
}


class FormSheet{
  constructor(ss) {
    this.ss = ss;
    this.sheet = ss.getSheetByName("Form Responses 1");
    this.lastRow = this.sheet.getLastRow();
    this.DATE_COLUMN = 1;
    this.NAME_COLUMN = 2;
    this.AMOUNT_COLUMN = 3;
    this.TYPE_COLUMN = 4;
    this.DATE_INDEX = 0;
    this.NAME_INDEX = 1;
    this.AMOUNT_INDEX = 2;
    this.TYPE_INDEX = 3;
  }

  getExpenses() {
    if (this.lastRow == 1) {
      return [];
    }
    let expenseRange = this.sheet.getRange(2, 1, this.lastRow - 1, this.TYPE_COLUMN);
    let rangeValues = expenseRange.getValues();
    let expenseList = [];
    for (let row of rangeValues) {
      let expenseDict = {
        date: new Date(row[this.DATE_INDEX]),
        name: row[this.NAME_INDEX],
        type: row[this.TYPE_INDEX],
        amount: row[this.AMOUNT_INDEX]
      };
      expenseList.push(new Expense(expenseDict));
    }
    return expenseList;
  }

  deleteExpenses() {
    if (this.lastRow == 1) {
      return;
    }
    this.sheet.deleteRows(2, this.lastRow - 1);
  }
}


class RecurringSheet{
  constructor(ss) {
    this.ss = ss;
    this.sheet = ss.getSheetByName("Monthly Recurring Expenses");
    this.lastRow = this.sheet.getLastRow();
    this.NAME_COLUMN = 1;
    this.NAME_INDEX = 0;
    this.AMOUNT_COLUMN = 2;
    this.AMOUNT_INDEX = 1;
  }

  getRecurringExpenses(date) {
    let recurringValues = this.sheet.getRange(2, 1, this.lastRow - 1, this.AMOUNT_COLUMN).getValues();
    let expenseList = [];
    let dateCopy = new Date(date);
    dateCopy.setDate(1);
    for (let row of recurringValues) {
      let expenseDict = {
        date: dateCopy,
        name: row[this.NAME_INDEX],
        type: "Recurring",
        amount: row[this.AMOUNT_INDEX]
      };
      expenseList.push(new Expense(expenseDict));
    }
    return expenseList;
  }
}


function sortExpenseList(list) {  // Sorts a passed array in place by date attribute
  list.sort((a, b) => a["date"] - b["date"]);
}


function createExpenseMatrix(list) {
  let expenseMatrix = [];
  for (let expense of list) {
    let date = dateFormat(expense["date"]);
    let expenseEntry = [date, expense["name"], expense["type"], expense["amount"]];
    expenseMatrix.push(expenseEntry);
  }
  return expenseMatrix;
}


function dateFormat(date) {
  return Utilities.formatDate(date, "US/Eastern", "M-d-yy hh:mm a");
}


function getSumTypes(list) {  // returns the sum of each category as a string
  let sumDict = {};
  for (let expense of list) {
    if (Object.keys(sumDict).includes(expense["type"])) {
      sumDict[expense["type"]] += parseFloat(expense["amount"]);
    }
    else {
      sumDict[expense["type"]] = parseFloat(expense["amount"]);
    }
  }
  for (let key of Object.keys(sumDict)) {
    sumDict[key] = sumDict[key].toFixed(2);
  }
  return sumDict;
}

function addExpenses(ss, list) {
  // First group the list of expenses by month
  let monthDict = {};
  for (let expense of list) {
    let sheetName = Utilities.formatDate(expense["date"], "US/Eastern", "LLLL yyyy");
    if (Object.keys(monthDict).includes(sheetName)) {
      monthDict[sheetName].push(expense);
    }
    else {
      monthDict[sheetName] = [expense];
    }
  }
  let sheetNames = Object.keys(monthDict);
  sheetNames.sort((a, b) => new Date(a) - new Date(b));
  for (let sheetName of sheetNames) {
    let monthSheet = new MonthlyExpenseSheet(ss, new Date(sheetName));
    monthSheet.addExpenses(monthDict[sheetName]);
  }
  let allExpenseSheet = new AllExpenseSheet(ss);
  allExpenseSheet.addExpenses(list);
}
