/*
 * TODO: Need to add the 'is_deleted' property to tables for soft deletion.
 * */
-- Drop existing tables (this has to be used cautiosly in production!)

-- Add extensions if necessary
create extension if not exists "pgcrypto";

-- Implement core entities (users has a tendency to be a repeated entity)

-- Users table (core entity)
create table users(
	user_id UUID primary key default gen_random_uuid(),
 	username varchar(128) unique not null,
	email varchar(255) unique not null check (email ~* '^[\w\-\.+@([\w-]+\.)+[\w-]{2,}$]'),
	password_hash varchar(255) not null,
	created_at make_timestamptz() not null default now(),
	updated_at make_timestamptz() not null default now(),
	last_login make_timestamptz(),
	is_active boolean not null default true,
	phone_number varchar(20),
	email_verified boolean not null default true,
	phone_verified boolean not null default true,
	given_name varchar(100),
	family_name varchar(100),
	profile_picture_url text
)

create table accounts(
	account_id uuid primary key default gen_random_uuid(),
	user_id foreign key not null,
	account_name varchar(100) not null,
	account_type varchar(100) not null, -- should i make this an enum?
	current_balance decimal(18,2) not null, default 0.00, -- this field should be calculated or maintained via database triggers/materialized views to ensure consistency with
	-- the sum of all associated Transactions
	currency varchar(3) not null, -- ISO 4217 currency code for account
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp when the account record was created.
	updated_at make_timestamptz() not null default now(), -- automatically records the timestamp of the last modification to the account record.
	is_active boolean not null default true -- flag to indicate if an account is active or closed/deactivated. this is for soft deletion or archiving accounts and historical data
	user_id foreign, -- one to many relation from users to accounts
	accounts foreign, -- one to many relation from accounts to transactions
	
	-- the current_balance property should b the sum of accounts associated transactions and this should be the only source of truth. I'm going to make it a computed column or materialized view.
	
)

create table budgets(
	budget_id uuid primary key default gen_random_uuid(),
	user_id foreign key not null, -- key relation to users table
	budget_name varchar(100 not null),
	start_date date not null, -- the calendar beginning date of budget period.
	end_date date not null, -- the calendar end date of the budget period.
	total_budget_amount decimal(18,2) not null,
	currency varchar(3) not null, -- the ISO 4217 currency code for the budget.
	is_recurring boolean not null default false,
	recurrence_period varchar(50), -- make this in to an enum or lookup table. if 'is_recurring' is true, this specifies the period (monthly, annually, weekly, quarterly)
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp of budget creation.
	updated_at make_timestamptz() not null default now(), -- automatically on update 'current_timestamp'. automatically records the timestamp of the last modification to the budget record.
	user_id foreign, -- one to many relation from users to accounts
	budgets foreign, -- one to many relation from budgets to budgetcategoryallocations -> the categories are for granular category level budgeting.
	transactions foreign, -- many to one relation from transactions to budgets. This one is optional for linking specific transactions directly to a budget, though often linked via budget category allocations.
)

create table categories(
	category_id uuid primary key,
	user_id foreign key null, -- links to users for table of user-defined custom categories. if this field is null it's a system defined (predefined) category
	category_name varchar(100) not null,
	category_type varchar(20) not null, -- make this into an enum. a classification of the category, indicating its financial nature (expense, income, transfer). to distinguish between spending and income types.
	parent_category_id foreign key nullable, -- self referencing foreign key that points to another category_id within the same table. This property is crucial for supporting hierarchical categories (e.g., 'Food' as a parent category for 'Groceries' and 'Dining Out')
	is_system_defined boolean, not null default false, -- a flag to distinguish between predefined system categories and those created by users.
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp of category creation.
	updated_at make_timestamptz() not null default now(), -- automatically on update 'current_timestamp'. automatically records the timestamp of the last modification to the category record.
	user_id foreign, -- one to many relation from users to accounts
	categories foreign, -- self referencing relationship for hierarchical structure (a category can have a parent category).
	transactions foreign, -- one to many relation from categories to transactions. 
)

create table transactions(
	transaction_id uuid primary key,
	account_id foreign key not null,
	category_id foreign key not null,
	budget_id foreign key nullable,
	transaction_date make_timestamptz() not null, -- the date & time when the transaction occurred.
	amount decimal(18,2) not null, --The monetary value of the transaction. It is crucial to use DECIMAL or NUMERIC data types for precise currency representation, avoiding floating-point inaccuracies inherent in floating-point numbers.
	transaction_type varchar(20) not null, -- make into an enum. just for clarifications vs category_type.
	description text, -- brief user provided not or system generated desc of the transaction.
	notes text, -- optional field and for user added details or comments.
	merchant_name varchar(255), -- the name of the merchant, vendor, or payee involved in the transaction. this is particularly for automated categorization and analysis.
	is_cleared boolean not null default false, -- a flag indicating whether the transaction has been reconciled or cleared by the bank.
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp of transaction creation.
	updated_at make_timestamptz() not null default now(), -- automatically on update 'current_timestamp'. automatically records the timestamp of the last modification to the transaction record.
	accounts foreign, -- many to one relation exists with accounts, as each transaction belongs to a specific account.
	categories foreign, -- many to one relation exists with categories, linking each transaction to its classification.
	budgets foreign, -- many to one relation exists with budgets (optionalj, for direct budget linking).

)

-- OBSERVATIONS: there is a one to many relationshitp from user to debts and one from debts to payments
-- there should be an optional one to one or one to many relationshipt from transactions to payments (if payment is also recorded as a general transaction)

create table debts(
	debt_id uuid primary key,
	user_id foreign key not null, -- one to many relationship
	debt_name varcahr(100) not null,
	creditor_name varchar(100) not null,
	original_amount decimal(18,2) not null,
	current_balance decimal(18,2) not null,
	interest_rate decimal(5,4) not null,
	minimum_payment decimal(18,2) not null,
	due_date date, -- next payment due date for the debt.
	loan_type varchar(50), -- change to enum. calssification of the loan (credit, student, mortgage, etc.)
	status varchar(50) not null default "Active", -- change to enum. status of the debt.
	priority varchar(50), -- change to enum. user defined or system calculated for repayment (e.g. high interest rates, smallest ballance, custom, etc.)
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp of debt creation.
	updated_at make_timestamptz() not null default now(), -- automatically on update 'current_timestamp'. automatically records the timestamp of the last modification to the debt record.
	payoff_date date, -- estimated or actual date when the debt was fully paid off.
)

create table payments(
	payment_id uuid primary key,
	debt_id foreign key not null, -- one to many relationship
	transaction_id foreign key nullable,
	payment_date make_timestamptz(), --date when the payment was made.
	notes text, -- optional field and for user added details or comments.
	amount_paid decimal(18,2) not null, -- amount of payment.
	payment_method varchar(50), -- how the payment was made.
	created_at make_timestamptz() not null default now(), -- automatically records the timestamp of payment creation.
)

-- THIS IS THE AUDIT TRAIL TABLE AND IT IS FOR LOG PURPOSES (aka, CRITICAL)
create table auditlog(
	log_id uuid primary key,
	log_timestamp make_timestamptz() not null default now(), -- the exact date & time the event ocurred.
	user_id foreign key nullable,
	event_type varchar(50) not null, -- the classification type of the log.
	entity_type varchar(50) not null, -- the type of database entity (our other tables)
	entity_id uuid nullable, -- id fo the specific entity affected by the event (example here: account_id)
	old_value jsonb, -- the state of the record before the change, stored as JSON
	new_value jsonb, -- the state of the record after the change, stored as JSON
	description text,
	ip_address varchar(45), -- the IP address from the originating action.
	user_agent text, -- the user agent string of the client performing the action.
	users foreign key nullable, -- many to one relationship with users (optional as some events might be system-generated.)
)

-- Create Indexes, where necessary