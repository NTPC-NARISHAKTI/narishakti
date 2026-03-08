package models

import "time"

type Inventory struct {
	ID        uint `gorm:"primaryKey"`
	ProductID uint
	Product   Product
	Quantity  int
	UpdatedAt time.Time
}
