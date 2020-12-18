# Introduction
Dataput is an npm package that integrates a database service without the need for external apps such as MySQL, but using JSON files created in your project folder.

# Why is it faster than other libraries?
This library is synchronous, so it doesn't use promises or callback functions.

## How to install it
- `npm init` for creating package.json
- `npm i dataput --save` for installing the package

# Step of use
## *Step 1* Import library
First, we need to import the package into our sketch.<br>
`const Dataput = require('dataput');`

## *Step 2* Set up databases
We also need to declare the databases we want to use, **whether they exist or not**
So keep this code always in your sketch, even if it's the 1000th time you run it
`const databaseLogin = new Dataput('DATABASE_NAME');`

## The creation of the files is AUTOMATIC
Once the database has been declared, if it does not exist the library will automatically create a folder (by default called 'storage', but it can be changed by setting the directory as the second parameter of the database declaration in the constructor) where it will then put the necessary files, which it will automatically create . In this case, it will create the directory: ./storage with the file ./storage/DATABASE_NAME.min.json

## *Step 3* definition of the table headers
Each database is a table, you can create as many databases as you want, but it is important that for each of them the headers are set, that is the names of the columns (example: ID, Name, Surname). You can do it this way

`databaseLogin.headers = ['ID', 'Name', 'Surname', 'Email address', 'Password'];`

These headers can be changed when you want, and depending on the number of elements in the header, the content will adapt, so be careful because if we change the headers with a smaller number, some data in the content of the table will be deleted.

<h1>Examples:</h1>
<table>
	<thead>
		<tr>
			<th>ID</th>
			<td>Name</td>
			<td>Surname</td>
			<td>Email address</td>
			<td>Password</td>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>1</td>
			<td>Simone</td>
			<td>Fracassetti</td>
			<td>simone@vocatus.space</td>
			<td>ed347a07305214ab98974a008674eb78cd03b1fedb73c8be9f79e40fb8e155b0</td>
		</tr>
	</tbody>
</table>


If we remove the "Surname" header from this table, the contents of the table will adapt to the number of Headers, so we will lose the given password

<table>
	<thead>
		<tr>
			<th>ID</th>
			<td>Name</td>
			<td>Email address</td>
			<td>Password</td>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>1</td>
			<td>Simone</td>
			<td>Fracassetti</td>
			<td>simone@vocatus.space</td>
			<td>? Item deleted</td>
		</tr>
	</tbody>
</table>

<div></div>
<div></div>

# Auto Increment
Many databases, if not all of them need a column that is a primary key and therefore that has a unique value, and often using autoincrement which is not necessary, it is very important to have it, to do this just use this syntax after the declaration database:
`databaseLogin.autoIncrement = 'ID'`

'ID' is the column that must have the property, and like the other options it can be changed later

# Methods INSERT, DELETE, UPDATEROW, TRUNCATE, DROP, QUERY

## Insert
Insert is used to insert a row into a database, and can be used simply like this:

<pre>databaseLogin.insert({
	ID: Dataput.AI, // Dataput.AI is used to specify that the value should be automatically entered with autoincrement
	Nome: 'Simone',
	Cognome: 'Fracassetti',
	'Indirizzo email': 'simone@vocatus.space',
	Password: 'ed347a07305214ab98974a008674eb78cd03b1fedb73c8be9f79e40fb8e155b0'
});</pre>

As you can see, it is very easy to insert a line, just use an object in JSON format. The ID column as it has the autoincrement property can receive as content "Dataput.AI", which makes the library understand that it must insert the value automatically, if "Dataput.AI" is used on a column without this property, an error will be returned.

## Delete
Insert is used to insert a row into a database, and can be used simply like this:

<pre>databaseLogin.delete({
	Nome: 'Simone',
	'Indirizzo email': 'simone@vocatus.space'
});</pre>

The delete method accepts as its only parameter a search that will be performed, and ** all ** rows that match the search will be deleted.

## Updaterow

<pre>databaseLogin.updateRow({
	Nome: 'Simone',
	'Indirizzo email': 'simone@vocatus.space'
}, {
	Nome: 'Andrea',
	Cognome: 'Bergamaschi'
});</pre>

The updateRow method accepts two parameters, the first is the one to search for the rows to update, and the second is the object that contains the changes

In this case, all lines with the name "Simone" and email address "simone@vocatus.space" will have a change to the name and surname with "Andrea" and "Bergamaschi" respectively

## Truncate
Truncate serves to eliminate ** all ** data from a datbase

<pre>databaseLogin.truncate();</pre>

No parameters required.

## Drop
Truncate need to drop a database

<pre>databaseLogin.drop();</pre>

No parameters required.


## Query

<pre>databaseLogin.query({
	Nome: 'Simone',
	'Indirizzo email': 'simone@vocatus.space'
});</pre>

The query method accepts two parameters and it's used for searching rows, the first argument is the one to search for rows, and the second is a boolean (default false, so it is not necessary to put it) which provides a more detailed output.

## rowsNumber
<pre>databaseLogin.rowsNumber</pre>
Will return the number of rows inside of this database

# Error handling
This library, not being asynchronous, returns any errors with functions, for example:
<pre>database.insert({
	ID: 1,
	Nome: Dataput.AI,
	Cognome: 'test',
	'Indirizzo email': 'test',
	Password: 'test'
});</pre>

It will return: `{result: false, error: "Auto Increment column is not the same as declared, you inserted: 'Nome', expected: 'ID'"}`

So pay attention to: ".result" in return to the method used.


# Secondary methods
Dataput.exists (not database.exists) it is a method to use to understand if a database exists or not, for example:
`Dataput.exists('test') => false`<br>
`Dataput.exists('DATABASE_NAME') => true`
