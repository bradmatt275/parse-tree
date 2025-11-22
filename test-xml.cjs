
const { XMLValidator } = require('fast-xml-parser');
const sax = require('sax');
const { SaxesParser } = require('saxes');

const xmlWithErrors = `
<root>
  <child>Unclosed tag
  <child2 attr="missing quote>Content</child2>
  <child3>Mismatched tag</child4>
</root>
`;

console.log('--- fast-xml-parser ---');
const result = XMLValidator.validate(xmlWithErrors, {
  allowBooleanAttributes: true
});
console.log('Result:', result);

console.log('\n--- saxes ---');
const parserSaxes = new SaxesParser();
const errorsSaxes = [];
parserSaxes.on("error", (e) => {
  errorsSaxes.push({ msg: e.message, line: parserSaxes.line });
  // Saxes doesn't have resume(), it just emits error and might stop or continue?
  // Documentation says: "The parser will emit an error event and then continue parsing."
});

try {
  parserSaxes.write(xmlWithErrors).close();
} catch (e) {
  // console.log("Saxes threw:", e.message);
}
console.log('Saxes Errors:', errorsSaxes);


