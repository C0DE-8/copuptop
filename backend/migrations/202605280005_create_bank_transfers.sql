-- UP
CREATE TABLE IF NOT EXISTS bank_transfers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NULL,
    reference VARCHAR(80) NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'flutterwave',
    provider_transfer_id VARCHAR(120) NULL,
    provider_reference VARCHAR(120) NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    bank_code VARCHAR(30) NOT NULL,
    account_number VARCHAR(40) NOT NULL,
    account_name VARCHAR(180) NULL,
    narration VARCHAR(180) NULL,
    status ENUM('pending', 'processing', 'successful', 'failed', 'reversed') NOT NULL DEFAULT 'pending',
    retry_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    provider_response JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bank_transfers_reference (reference),
    UNIQUE KEY uq_bank_transfers_provider_transfer_id (provider, provider_transfer_id),
    KEY idx_bank_transfers_user_id (user_id),
    KEY idx_bank_transfers_wallet_id (wallet_id),
    KEY idx_bank_transfers_status (status),
    CONSTRAINT fk_bank_transfers_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_bank_transfers_wallet_id
        FOREIGN KEY (wallet_id) REFERENCES wallets (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_bank_transfers_transaction_id
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_bank_transfers_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

