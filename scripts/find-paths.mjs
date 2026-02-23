async function find() {
    const url = 'https://openapi.twse.com.tw/v1/swagger.json';
    const res = await fetch(url);
    const data = await res.json();
    const paths = Object.keys(data.paths).filter(p => p.includes('T86') || p.includes('fund'));
    console.log(JSON.stringify(paths, null, 2));
}
find();
