CREATE TABLE `ano_letivo` (
	`id` text PRIMARY KEY NOT NULL,
	`rotulo` text NOT NULL,
	`escola` text,
	`serie` text,
	`inicio` text NOT NULL,
	`fim` text NOT NULL,
	`formula_spec_id` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `avaliacao` (
	`id` text PRIMARY KEY NOT NULL,
	`materia_id` text NOT NULL,
	`periodo_id` text NOT NULL,
	`titulo` text NOT NULL,
	`tipo_id` text NOT NULL,
	`peso` integer NOT NULL,
	`nota_maxima_milis` integer NOT NULL,
	`data` text,
	`obrigatoria` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`materia_id`) REFERENCES `materia`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`periodo_id`) REFERENCES `periodo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `materia` (
	`id` text PRIMARY KEY NOT NULL,
	`ano_letivo_id` text NOT NULL,
	`nome` text NOT NULL,
	`professor` text,
	`cor` text,
	`carga_horaria` integer,
	`formula_spec_id_override` text,
	`arquivada` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`ano_letivo_id`) REFERENCES `ano_letivo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `nota` (
	`id` text PRIMARY KEY NOT NULL,
	`avaliacao_id` text NOT NULL,
	`valor_milis` integer NOT NULL,
	`origem` text NOT NULL,
	`atualizado_em` text NOT NULL,
	FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacao`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `periodo` (
	`id` text PRIMARY KEY NOT NULL,
	`ano_letivo_id` text NOT NULL,
	`ordem` integer NOT NULL,
	`nome` text NOT NULL,
	`inicio` text,
	`fim` text,
	FOREIGN KEY (`ano_letivo_id`) REFERENCES `ano_letivo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospecto` (
	`id` text PRIMARY KEY NOT NULL,
	`ano_letivo_id` text NOT NULL,
	`titulo` text NOT NULL,
	`caminho_relativo` text NOT NULL,
	`mime_type` text NOT NULL,
	`tamanho` integer NOT NULL,
	`hash` text NOT NULL,
	`importado_em` text NOT NULL,
	FOREIGN KEY (`ano_letivo_id`) REFERENCES `ano_letivo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rascunho` (
	`chave` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`atualizado_em` text NOT NULL
);
