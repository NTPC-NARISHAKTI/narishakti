package models

import "time"

type Order struct {
	BaseModel

	PostID           uint
	Post             Post
	UserID           uint
	User             User
	OrderQuantity    int
	OrderStatus      string     `gorm:"index:idx_orders_status_confirmed"`
	OrderConfirmedAt *time.Time `gorm:"index:idx_orders_status_confirmed"`
	UnitPrice        float64
	GrossAmount      float64
	Currency         string `gorm:"size:8;default:INR"`
	TotalPrice       float64
	Address          string
}
