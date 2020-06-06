// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;
const logos = [
  ['KFC', 'kfc.co.uk'],
  ['TOOLSTATION', 'toolstation.co.uk'],
  ['ASDA', 'asda.com'],
  ['TESCO', 'tesco.com'],
  ['ALDI', 'aldi.co.uk'],
  ['APPLE', 'apple.com'],
  ['NOWTV', 'nowtv.com'],
  ['WAITROSE', 'waitrose.co.uk'],
  ['AMZN', 'amazon.co.uk'],
  ['Amazon', 'amazon.co.uk'],
  ['Kindle', 'amazon.co.uk'],
  ['WCC', 'winchester.gov.uk'],
];

const notfound = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADLSURBVDhPnZRBEsIwCEVpj+Bad3r/A7l0rVeItME2wA8wvkXLTH5eUpjp8r7e6cfl9ZSqxuf2kIpolffOuJBiwkrEFF0+ZkVM6oKBFfYlcMEllmw3qrtmFn7Kp1VcgYU5exS7YguztNak3IEbIOZgOzV4L4+PgfGnLhgAIiZwzZaw6A+wKGj5bAmI0sHBgBUVx+9jSgQt3F3YYBM+RTOLKUbGLSKKLZ3YtYkqlk7gUv/sA7jhAB5sp8bEFgYGrCi1dHxMiYqWjgoTfQHOp2KF5Mf1pAAAAABJRU5ErkJggg==';

module.exports = (text) => {
  const logo = logos.find((l) => text.includes(l[0]));
  return logo === undefined ? '' : `https://logo.clearbit.com/${logo[1]}`;
};