/*
 * PostgreSQL Schema for Personal Finance Management Application
 * Conforms to Design Specifications Document
 * Includes: Users, Accounts, Categories, Budgets, Transactions, Debts, Payments, Audit Log
 * Features: Soft Deletion, Multi-Currency Support, Hierarchical Categories, Budget Allocations
 */

-- Enable cryptographic functions for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom ENUM types
CREATE TYPE account_type AS ENUM (
    'CHECKING', 'SAVINGS', 'CREDIT_CARD', 
    'INVESTMENT', 'LOAN', 'CASH', 'OTHER'
);

CREATE TYPE transaction_type AS ENUM (
    'INCOME', 'EXPENSE', 'TRANSFER'
);

CREATE TYPE budget_recurrence AS ENUM (
    'NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY',
    'MONTHLY', 'QUARTERLY', 'ANNUALLY'
);

CREATE TYPE debt_status AS ENUM (
    'ACTIVE', 'PAID_OFF', 'DEFAULTED', 
    'SETTLED', 'COLLECTIONS'
);

CREATE TYPE debt_priority AS ENUM (
    'HIGH_INTEREST', 'SMALLEST_BALANCE', 
    'HIGHEST_BALANCE', 'CUSTOM'
);

-- Users table (Core entity with enhanced security)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    phone_number VARCHAR(20),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,  -- Security compliance
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,  -- Security compliance
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    profile_picture_url TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    user_metadata JSONB,  -- For flexible user preferences
    app_metadata JSONB    -- For application-specific settings
);

-- Accounts table with currency validation
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    account_type ACCOUNT_TYPE NOT NULL,  -- ENUM usage
    current_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    institution_name VARCHAR(100),  -- Added per financial account requirements
    last_synced_at TIMESTAMPTZ      -- For external account connections
);

-- Categories with hierarchical support
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL,
    category_type TRANSACTION_TYPE NOT NULL,  -- ENUM usage
    parent_category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    is_system_defined BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    color_code VARCHAR(7),  -- For UI presentation
    UNIQUE (user_id, category_name)  -- Per-user unique category names
);

-- Budgets with recurrence support
CREATE TABLE budgets (
    budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    budget_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (start_date < end_date),
    total_budget_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_period BUDGET_RECURRENCE NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Budget Category Allocations (Required for granular budgeting)
CREATE TABLE budget_category_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(budget_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    allocated_amount DECIMAL(18,2) NOT NULL CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (budget_id, category_id)  -- One allocation per category per budget
);

-- Transactions with full multi-currency support
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(category_id),
    budget_id UUID REFERENCES budgets(budget_id) ON DELETE SET NULL,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    transaction_type TRANSACTION_TYPE NOT NULL,  -- ENUM usage
    description TEXT,
    notes TEXT,
    merchant_name VARCHAR(255),
    payment_method VARCHAR(50),
    is_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Multi-currency fields
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    original_amount DECIMAL(18,2),
    original_currency VARCHAR(3) CHECK (original_currency ~ '^[A-Z]{3}$'),
    
    -- Reconciliation fields
    reconciled_at TIMESTAMPTZ,
    reconciliation_id UUID
);

-- Debts with enhanced financial tracking
CREATE TABLE debts (
    debt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    debt_name VARCHAR(100) NOT NULL,
    creditor_name VARCHAR(100) NOT NULL,
    original_amount DECIMAL(18,2) NOT NULL,
    current_balance DECIMAL(18,2) NOT NULL,
    interest_rate DECIMAL(7,4) NOT NULL,  -- Supports rates like 15.9999%
    minimum_payment DECIMAL(18,2) NOT NULL,
    due_date DATE,
    loan_type VARCHAR(50),
    status DEBT_STATUS NOT NULL DEFAULT 'ACTIVE',  -- ENUM usage
    priority DEBT_PRIORITY,  -- ENUM usage
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payoff_date DATE,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    apr DECIMAL(7,4),  -- Separate from base interest rate
    term_months INT     -- Loan term in months
);

-- Payments with transaction linking
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(debt_id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_paid DECIMAL(18,2) NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    applied_interest DECIMAL(18,2) DEFAULT 0.00,  -- Interest portion of payment
    applied_principal DECIMAL(18,2)               -- Principal portion of payment
);

-- Audit Log (Immutable record of changes)
CREATE TABLE auditlog (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    -- No deleted_at for audit logs
    session_id UUID  -- For tracking user sessions
);

-- ========================
-- TRIGGERS AND FUNCTIONS
-- ========================

-- Function to update timestamp on record modification
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to maintain account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE accounts 
    SET current_balance = (
        SELECT COALESCE(SUM(
            CASE WHEN transaction_type = 'INCOME' THEN amount
                 WHEN transaction_type = 'EXPENSE' THEN -amount
                 ELSE 0 
            END
        ), 0.00)
        FROM transactions 
        WHERE account_id = NEW.account_id
        AND deleted_at IS NULL
    )
    WHERE account_id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to maintain debt balances
CREATE OR REPLACE FUNCTION update_debt_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE debts 
    SET current_balance = GREATEST(0, original_amount - COALESCE((
        SELECT SUM(amount_paid)
        FROM payments 
        WHERE debt_id = NEW.debt_id
        AND deleted_at IS NULL
    ), 0))
    WHERE debt_id = NEW.debt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for automated budget rollover
CREATE FUNCTION rollover_budget()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO budgets (
        user_id, budget_name, start_date, end_date, 
        total_budget_amount, currency, is_recurring, 
        recurrence_period
    )
    SELECT 
        user_id, 
        budget_name || ' ' || TO_CHAR(NOW(), 'YYYY-MM'),
        NOW() + interval '1 month',
        NOW() + interval '2 months' - interval '1 day',
        total_budget_amount,
        currency,
        TRUE,
        'MONTHLY'
    FROM budgets
    WHERE budget_id = NEW.budget_id
    AND recurrence_period = 'MONTHLY'
    AND end_date = NEW.end_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_users_modified
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_accounts_modified
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_categories_modified
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_budgets_modified
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_transactions_modified
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_debts_modified
BEFORE UPDATE ON debts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create triggers for balance maintenance
CREATE TRIGGER account_balance_after_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER debt_balance_after_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_debt_balance();

-- ========================
-- INDEXES FOR PERFORMANCE
-- ========================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(user_id) WHERE deleted_at IS NULL;

-- Accounts table indexes
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_active ON accounts(account_id) WHERE deleted_at IS NULL;

-- Categories table indexes
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- Transactions table indexes
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_cleared ON transactions(is_cleared) WHERE NOT is_cleared;

-- Budgets table indexes
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- Debts table indexes
CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debts_status ON debts(status);

-- Payments table indexes
CREATE INDEX idx_payments_debt ON payments(debt_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Audit log indexes
CREATE INDEX idx_audit_entity ON auditlog(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON auditlog(log_timestamp);

-- ========================
-- Row-Level Security
-- ========================

-- row security for accounts.
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_accounts ON accounts 
    USING (user_id = current_user_id());

-- ========================
-- MATERIALIZED VIEWS
-- ========================

-- For fast balance queries
CREATE MATERIALIZED VIEW account_balances AS
SELECT 
    a.account_id,
    COALESCE(SUM(
        CASE t.transaction_type 
            WHEN 'INCOME' THEN t.amount
            WHEN 'EXPENSE' THEN -t.amount
            ELSE 0 
        END
    ), 0.00) AS current_balance,
    MAX(t.transaction_date) AS last_transaction
FROM accounts a
LEFT JOIN transactions t ON a.account_id = t.account_id
WHERE a.deleted_at IS NULL AND t.deleted_at IS NULL
GROUP BY a.account_id;

-- Budget progress view
CREATE MATERIALIZED VIEW budget_progress AS
SELECT 
    b.budget_id,
    b.total_budget_amount,
    COALESCE(SUM(t.amount), 0.00) AS spent_amount,
    COALESCE(SUM(t.amount) / NULLIF(b.total_budget_amount, 0), 0) AS progress
FROM budgets b
LEFT JOIN transactions t ON b.budget_id = t.budget_id
WHERE b.deleted_at IS NULL AND t.deleted_at IS NULL
GROUP BY b.budget_id;


-- Transaction Reconciliation
ALTER TABLE transactions ADD COLUMN reconciled_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN reconciliation_id UUID;