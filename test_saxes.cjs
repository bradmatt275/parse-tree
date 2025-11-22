const { SaxesParser } = require('saxes');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    genreComputer/genre>
    <price>44.95</price>
    <publish_date>2000-10-01</publish_date
    <description>An in-depth look at creating applications with XML.</description>
  </book>
</catalog>`;

const errors = [];
const parser = new SaxesParser();

parser.on("error", (e) => {
  console.log(`Error found: Line ${parser.line}, Column ${parser.column}: ${e.message}`);
  errors.push(e);
});

try {
  parser.write(xml).close();
} catch (e) {
  console.log("Parser threw exception:", e.message);
}

console.log("Total errors:", errors.length);
