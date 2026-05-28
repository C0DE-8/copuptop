-- UP
CREATE TABLE IF NOT EXISTS flutterwave_accounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NOT NULL,
    reference VARCHAR(80) NOT NULL,
    account_number VARCHAR(40) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    account_name VARCHAR(180) NULL,
    flw_reference VARCHAR(120) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    status ENUM('active', 'inactive', 'failed') NOT NULL DEFAULT 'active',
    provider_response JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_flutterwave_accounts_user_currency (user_id, currency),
    UNIQUE KEY uq_flutterwave_accounts_reference (reference),
    UNIQUE KEY uq_flutterwave_accounts_number (account_number),
    KEY idx_flutterwave_accounts_wallet_id (wallet_id),
    CONSTRAINT fk_flutterwave_accounts_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_flutterwave_accounts_wallet_id
        FOREIGN KEY (wallet_id) REFERENCES wallets (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NULL,
    type ENUM('wallet_funding', 'wallet_transfer', 'bank_transfer') NOT NULL,
    direction ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    reference VARCHAR(80) NOT NULL,
    provider VARCHAR(40) NULL,
    provider_reference VARCHAR(120) NULL,
    provider_transaction_id VARCHAR(120) NULL,
    status ENUM('pending', 'successful', 'failed', 'reversed') NOT NULL DEFAULT 'pending',
    description VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_transactions_reference (reference),
    UNIQUE KEY uq_transactions_provider_reference (provider, provider_reference),
    KEY idx_transactions_user_id (user_id),
    KEY idx_transactions_wallet_id (wallet_id),
    KEY idx_transactions_status (status),
    CONSTRAINT fk_transactions_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_transactions_wallet_id
        FOREIGN KEY (wallet_id) REFERENCES wallets (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

