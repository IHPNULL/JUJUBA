CREATE TABLE `frente` (
	`id` text PRIMARY KEY NOT NULL,
	`materia_id` text NOT NULL,
	`ordem` integer NOT NULL,
	`nome` text NOT NULL,
	FOREIGN KEY (`materia_id`) REFERENCES `materia`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `avaliacao` ADD `frente_id` text NOT NULL REFERENCES frente(id);