-- UP
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    wallet_id BIGINT UNSIGNED NOT NULL,
    transaction_id BIGINT UNSIGNED NULL,
    entry_group VARCHAR(80) NOT NULL,
    reference VARCHAR(80) NOT NULL,
    entry_type ENUM('debit', 'credit') NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    balance_after DECIMAL(19, 4) NOT NULL,
    counterparty_wallet_id BIGINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wallet_ledger_wallet_reference (wallet_id, reference),
    KEY idx_wallet_ledger_entry_group (entry_group),
    KEY idx_wallet_ledger_wallet_id (wallet_id),
    KEY idx_wallet_ledger_transaction_id (transaction_id),
    CONSTRAINT fk_wallet_ledger_wallet_id
        FOREIGN KEY (wallet_id) REFERENCES wallets (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_wallet_ledger_transaction_id
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_wallet_ledger_counterparty_wallet_id
        FOREIGN KEY (counterparty_wallet_id) REFERENCES wallets (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_wallet_ledger_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_wallet_ledger_balance_non_negative CHECK (balance_after >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

