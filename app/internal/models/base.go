package models

import "time"

type BaseModel struct {
	ID        uint `gorm:"primaryKey"`
	IsDeleted bool `gorm:"default:false"`
	CreatedAt time.Time
	CreatedBy uint
	UpdatedAt time.Time
	UpdatedBy uint
}
