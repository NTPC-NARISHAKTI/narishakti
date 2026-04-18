package models

import "time"

type Log struct {
	BaseModel
	Action     string    `gorm:"size:255;not null"` // e.g., "CREATED", "UPDATED", "DELETED", "APPROVED", "CONFIRMED"
	EntityType string    `gorm:"size:100;not null"` // e.g., "USER", "POST", "ORDER", "PRODUCT", "PROJECT", "INVENTORY"
	EntityID   uint      `gorm:"not null"`          // ID of the entity that was acted upon
	UserID     uint      `gorm:"not null"`          // ID of the user who performed the action
	User       User      `gorm:"foreignKey:UserID"` // Relationship to the user who performed the action
	Details    string    `gorm:"type:text"`         // Additional details about the action
	Timestamp  time.Time `gorm:"autoCreateTime"`    // When the action occurred
}
