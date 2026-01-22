loadCountries(); async function loadCountries() {
  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/population/cities');
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (!data.data) return;

    // Find Singapore data to see structure
    const singaporeData = data.data.find(item => item.country === 'Singapore');
    console.log('Singapore data:', JSON.stringify(singaporeData, null, 2));

    const seen = new Set();

    data.data.forEach(item => {
      const country = item.country;
      if (!seen.has(country)) {
        console.log(country);  // prints each country once
        seen.add(country);
      }
    });
  } catch (error) {
    console.error('Failed to load countries', error);
  }
}
