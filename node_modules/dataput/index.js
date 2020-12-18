const fs = require('fs');
const AI = Symbol('ai::()');
const fetch = require('node-fetch');
const colors = require('colors');

fetch('https://www.npmjs.com/package/dataput').then(reseponse => reseponse.text()).then(body => {
  const lts = body.split('"latest":"')[1].split('"')[0];
  try{
    const current = JSON.parse(fs.readFileSync('./node_modules/dataput/package.json').toString()).version;
    if(current !== lts)
      console.log('\n\n• • • • • • • • • • • • • •\n%s\n%s\n• • • • • • • • • • • • • •\n\n'.yellow.bold, 'There is an available update of Dataput!'.green, 'https://www.npmjs.com/package/dataput'.yellow.bold);
  }
  catch(error){ /* */ }
});

module.exports = class{
  constructor(name, dir = './storage'){
    this.name = name;
    this.dir = dir;
    this.path = `${this.dir}/${this.name}.min.json`;

    if(!fs.existsSync('./storage'))
      fs.mkdirSync(dir);

    if(!fs.existsSync(this.path))
      fs.writeFileSync(this.path, '{"online":true,"options":{},"data":{"head":[],"body":[]}}');
  }

  set headers(newHeaders){
    const read = this.read;
    read.data.head = newHeaders;
    read.data.body = read.data.body.map(i => i.length > newHeaders.length ? i.slice(0, newHeaders.length) : i);
    this.update(read);
  }

  set autoIncrement(columnName){
    const read = this.read;
    if(read.data.head.includes(columnName))
      read.options.autoIncrement = columnName;
    else if(columnName === false)
      delete read.options.autoIncrement;

    this.update(read);
  }

  update(read){
    fs.writeFileSync(this.path, JSON.stringify(read));
  }

  truncate(){
    const read = this.read;
    read.data.body = [];
    this.update(read);
    return { result: true };
  }

  drop(){
    fs.unlinkSync(this.path);
    return { result: true };
  }

  query(searchObject, details = false){
    const read = this.read;
    let items = read.data.body.map((item, index) => {return {item, index}});

    Object.keys(searchObject).forEach(i => {
      if(read.data.head.includes(i))
        searchObject[read.data.head.indexOf(i)] = searchObject[i];
      delete searchObject[i];
    });

    Object.keys(searchObject).forEach(query => items = items.filter((row, index) => row.item[query] == searchObject[query]));
    const indexes = items.map(i => i.index);
    items = items.map(i => i.item);

    return (details ? {result: true, output: {indexes, items}, parsed_query: searchObject} : { result: true, output: items });
  }

  delete(searchObject){
    const read = this.read;
    const found = this.query(searchObject, true).output;
    read.data.body = read.data.body.filter((item, index) => !found.indexes.includes(index));
    this.update(read);
    return { result: true, deletedRows: found.items };
  }

  updateRow(searchObject, replaceObject){
    const read = this.read;
    const found = this.query(searchObject, true).output;

    found.indexes.forEach(i => {
      Object.keys(replaceObject).forEach(e => {
        const changeIndex = read.data.head.indexOf(e);
        read.data.body[i][changeIndex] = replaceObject[e];
      })
    });

    this.update(read);
    return { result: true, deletedRows: found.items };
  }

  insert(data){
    const read = this.read;
    const unexistingColumn = Object.keys(data).filter(i => !read.data.head.includes(i));

    if(unexistingColumn.length === 0){
      const autoIncrement = Object.keys(data)[Object.values(data).indexOf(module.exports.AI)];
      if(autoIncrement && read.options.autoIncrement !== autoIncrement) return {result: false, error: `Auto Increment column is not the same as declared, you inserted: '${autoIncrement}', expected: '${read.options.autoIncrement}'`};

      let base = read.data.head;
      const row = base.map(i => data[i]);
      if(row[read.data.head.indexOf(read.options.autoIncrement)] === module.exports.AI)
        row[read.data.head.indexOf(read.options.autoIncrement)] = read.data.body.length + 1;
      read.data.body.push(row);

      this.update(read);
      return {result: true, output: row};
    }
    else return {result: false, error: `${unexistingColumn.length} column${unexistingColumn.length === 1 ? '' : 's'} don't exist`, attach: unexistingColumn}
  }

  get read(){
    return JSON.parse(fs.readFileSync(this.path));
  }

  get rowsNumber(){
    return JSON.parse(fs.readFileSync(this.path).toString()).data.body.length;
  }

  static get AI(){
    return AI;
  }

  static exists(name, dir = './storage'){
    if(!fs.existsSync(`${dir}/${name}.min.json`)) return false;
    const read = JSON.parse(fs.readFileSync(`${dir}/${name}.min.json`));
    return !!read.online;
  }

}
