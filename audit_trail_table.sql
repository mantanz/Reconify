CREATE TABLE audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 