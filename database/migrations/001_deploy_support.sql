-- UniPlace deploy support
-- Run this in your production MySQL database before approving real businesses.

CREATE TABLE IF NOT EXISTS business_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    document_type VARCHAR(40) NOT NULL,
    document_label VARCHAR(120) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_business_documents_business_id (business_id),
    INDEX idx_business_documents_type (document_type),
    CONSTRAINT fk_business_documents_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
);

-- Optional but recommended for an exact public map.
-- Run these only if your businesses table does not already have coordinates.
-- ALTER TABLE businesses ADD COLUMN latitude DECIMAL(10, 7) NULL;
-- ALTER TABLE businesses ADD COLUMN longitude DECIMAL(10, 7) NULL;
