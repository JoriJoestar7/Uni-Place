import { pool } from "../db.js";

const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        display_name VARCHAR(120) NULL,
        email VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'professor', 'entrepreneur', 'admin') NOT NULL DEFAULT 'student',
        phone VARCHAR(40) NULL,
        bio TEXT NULL,
        avatar_url LONGTEXT NULL,
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_code_hash VARCHAR(255) NULL,
        verification_code_expires_at DATETIME NULL,
        last_verification_sent_at DATETIME NULL,
        verified_at DATETIME NULL,
        password_reset_code_hash VARCHAR(255) NULL,
        password_reset_expires_at DATETIME NULL,
        last_password_reset_sent_at DATETIME NULL,
        password_changed_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_user_id INT NOT NULL,
        business_name VARCHAR(180) NOT NULL,
        slug VARCHAR(190) NOT NULL,
        description TEXT NOT NULL,
        short_description VARCHAR(300) NULL,
        business_type VARCHAR(100) NOT NULL,
        category_label VARCHAR(120) NULL,
        category_id INT NULL,
        city VARCHAR(120) NULL,
        address VARCHAR(255) NULL,
        campus_zone VARCHAR(160) NULL,
        reference_point VARCHAR(255) NULL,
        latitude DECIMAL(10, 7) NULL,
        longitude DECIMAL(10, 7) NULL,
        phone VARCHAR(40) NULL,
        whatsapp VARCHAR(40) NULL,
        email VARCHAR(190) NULL,
        website_url VARCHAR(500) NULL,
        instagram_url VARCHAR(500) NULL,
        facebook_url VARCHAR(500) NULL,
        tiktok_url VARCHAR(500) NULL,
        price_min DECIMAL(10, 2) NULL,
        price_max DECIMAL(10, 2) NULL,
        payment_methods TEXT NULL,
        delivery_options TEXT NULL,
        service_area TEXT NULL,
        keywords TEXT NULL,
        target_audience TEXT NULL,
        main_products TEXT NULL,
        menu_summary TEXT NULL,
        schedule_summary TEXT NULL,
        faq_summary TEXT NULL,
        ai_extra_context TEXT NULL,
        logo_url VARCHAR(500) NULL,
        cover_image_url VARCHAR(500) NULL,
        status ENUM('pending', 'approved', 'rejected', 'hidden') NOT NULL DEFAULT 'pending',
        is_ai_visible TINYINT(1) NOT NULL DEFAULT 0,
        rejection_reason TEXT NULL,
        rejected_at DATETIME NULL,
        resubmitted_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_businesses_owner (owner_user_id),
        UNIQUE KEY uq_businesses_slug (slug),
        KEY idx_businesses_status (status),
        CONSTRAINT fk_businesses_owner
            FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        item_name VARCHAR(180) NOT NULL,
        item_description TEXT NULL,
        item_category VARCHAR(120) NULL,
        price DECIMAL(10, 2) NULL,
        is_available TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business_menu_business (business_id),
        CONSTRAINT fk_business_menu_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        day_of_week ENUM(
            'monday', 'tuesday', 'wednesday', 'thursday',
            'friday', 'saturday', 'sunday'
        ) NOT NULL,
        opening_time TIME NULL,
        closing_time TIME NULL,
        is_closed TINYINT(1) NOT NULL DEFAULT 0,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business_hours_business (business_id),
        CONSTRAINT fk_business_hours_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        question VARCHAR(300) NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business_faqs_business (business_id),
        CONSTRAINT fk_business_faqs_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_ai_knowledge (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        knowledge_text LONGTEXT NOT NULL,
        keywords TEXT NULL,
        priority_score INT NOT NULL DEFAULT 70,
        knowledge_status ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
        times_used INT UNSIGNED NOT NULL DEFAULT 0,
        last_used_at DATETIME NULL,
        last_generated_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_business_knowledge_business (business_id),
        KEY idx_business_knowledge_status (knowledge_status),
        CONSTRAINT fk_business_knowledge_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        caption VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business_photos_business (business_id),
        CONSTRAINT fk_business_photos_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS business_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        document_type VARCHAR(40) NOT NULL,
        document_label VARCHAR(120) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        file_size INT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_business_documents_business (business_id),
        KEY idx_business_documents_type (document_type),
        CONSTRAINT fk_business_documents_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS chat_recommendation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        query_text TEXT NOT NULL,
        matched_business_ids JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_chat_logs_user (user_id),
        KEY idx_chat_logs_created_at (created_at),
        CONSTRAINT fk_chat_logs_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

const migrationStatements = [
    `ALTER TABLE users MODIFY avatar_url LONGTEXT NULL`
];

export async function initializeDatabase() {
    const connection = await pool.getConnection();

    try {
        for (const statement of schemaStatements) {
            await connection.query(statement);
        }

        for (const statement of migrationStatements) {
            await connection.query(statement);
        }

        console.log("DATABASE_SCHEMA_READY");
    } finally {
        connection.release();
    }
}
