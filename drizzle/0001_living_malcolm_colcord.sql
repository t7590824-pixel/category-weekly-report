CREATE TABLE `skc_monthly_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country` varchar(10) NOT NULL,
	`business_year_and_week` varchar(20) NOT NULL,
	`skc` varchar(64) NOT NULL,
	`second_category` varchar(64),
	`third_category` varchar(64),
	`first_list_date` varchar(32),
	`occasion` varchar(64),
	`first_second_color` varchar(32),
	`sales` double,
	`qty` double,
	`collection_exposure` double,
	`collection_click` double,
	`pdp_exposure` double,
	`add_cart` double,
	`checkout` double,
	`on_shelf_days` int,
	`on_shelf_range` varchar(32),
	`new_old_flag` varchar(16),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skc_monthly_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_period_country` ON `skc_monthly_data` (`business_year_and_week`,`country`);
