const axios = require('axios');
const fs = require('fs');

const stateCodes = ['AN', 'AP', 'ARP', 'AS', 'BH', 'CD', 'CSG', 'DEL', 'GDD', 'GJ', 'HR', 'HP', 'JK', 'JRK', 'KAR', 'KER', 'LDK', 'MP', 'MAH', 'MNP', 'MGL', 'MZ', 'NG', 'OR', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TG', 'TRP', 'DDH', 'UP', 'UTK', 'WB'];
// const stateCodes = ['KAR'];

async function fetchForState(state) {
  return axios.post(
    'https://associates.indianoil.co.in/PumpLocator/StateWiseLocator',
    `state=${state}`,
    { headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }}
  ).then(function (response) {
    console.log(`downloaded ${state}`);
    const linedata = response.data.split('\|');
    const csvData = [];
    const data = [];
    for (const line of linedata) {
      const col = line.split(',');
      csvData.push(`${col[1]}, ${col[2]}, ${col[26]}, ${col[27]}`);
      data.push([parseFloat(col[1]), parseFloat(col[2]), parseFloat(col[25]), parseFloat(col[26])]);
    }
    return data;
  })
  .catch(function (error) {
    console.log(error);
  });
};

function cleanData (raw) {
  indiaXBounds = [68, 98];
  indiaYBounds = [8, 38];
  return raw.filter(datum => {
    if (isNaN(datum[0]) || isNaN(datum[1]) || isNaN(datum[2]) || isNaN(datum[3])) {
      return false;
    }
    if (datum[1] < indiaXBounds[0] || datum[1] > indiaXBounds[1] || datum[0] < indiaYBounds[0] || datum[0] > indiaYBounds[1]) {
      return false;
    }
    return true;
  })
}

async function main() {
  const data = ['lat,long,petrol,diesel,state'];
  for (const state of stateCodes) {
    const raw = await fetchForState(state);
    const clean = cleanData(raw);
    data.push(...clean.map( datum => `${datum[0]},${datum[1]},${datum[2]},${datum[3]},${state}`));
  }
  fs.writeFileSync(`data/data.csv`, data.join('\n'));
}

main();