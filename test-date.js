
const { format } = require('date-fns');
const { he } = require('date-fns/locale');

const date = new Date(2023, 8, 3); // Sept 3, 2023

console.log('PP:', format(date, 'PP', { locale: he }));
console.log('P:', format(date, 'P', { locale: he }));
console.log('dd/MM/yyyy:', format(date, 'dd/MM/yyyy', { locale: he }));
console.log('EEEE, d MMMM yyyy:', format(date, 'EEEE, d MMMM yyyy', { locale: he }));
