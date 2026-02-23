async function test() {
    const url = 'https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci';
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Received ${data.length} records.`);
        if (data.length > 0) {
            console.log('Sample:', data[0]);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
