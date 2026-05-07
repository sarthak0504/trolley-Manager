const parseDDMMYYYY = (str) => {
  const [day, month, year] = str.split('-');
  return new Date(`${year}-${month}-${day}T00:00:00`);
};
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};
const getRentForCycle = (cycleDateStr, rentHistory, fallbackRent) => {
  if (!rentHistory || !rentHistory.length) return Number(fallbackRent);
  const cycleDate = parseDDMMYYYY(cycleDateStr);
  const sortedHistory = [...rentHistory].sort((a, b) => 
    parseDDMMYYYY(a.effectiveDate).getTime() - parseDDMMYYYY(b.effectiveDate).getTime()
  );
  let currentRent = Number(fallbackRent);
  for (const hist of sortedHistory) {
    if (parseDDMMYYYY(hist.effectiveDate).getTime() <= cycleDate.getTime()) {
      currentRent = Number(hist.amount);
    }
  }
  return currentRent;
};

// Simulation: Edit Rent History
let rental = { 
  startDate: '01-01-2026',
  lastRentAddedOn: '02-04-2026', // Month 4
  monthlyRent: 3000,
  rentHistory: [{ effectiveDate: '01-01-2026', amount: 3000 }]
};

const formatDDMMYYYY = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const targetCycleDateStr = '02-03-2026'; // e.g. Month 3
const newRentAmount = 5000;

const oldHistory = JSON.parse(JSON.stringify(rental.rentHistory));
let updatedHistory = JSON.parse(JSON.stringify(oldHistory));
updatedHistory.push({ effectiveDate: targetCycleDateStr, amount: newRentAmount });

let oldLiability = 0;
let newLiability = 0;

const start = parseDDMMYYYY(rental.startDate);
const last = parseDDMMYYYY(rental.lastRentAddedOn);
let iterDate = start;

while (iterDate.getTime() <= last.getTime()) {
  const cycleStr = formatDDMMYYYY(iterDate);
  const correctNewRent = getRentForCycle(cycleStr, updatedHistory, rental.monthlyRent);
  const correctOldRent = getRentForCycle(cycleStr, oldHistory, rental.monthlyRent);
  
  newLiability += correctNewRent;
  oldLiability += correctOldRent;
  
  console.log(`Cycle: ${cycleStr} | Old: ${correctOldRent} | New: ${correctNewRent}`);
  
  iterDate = addDays(iterDate, 30);
}

console.log(`exactLiabilityDifference: ${newLiability - oldLiability}`);
