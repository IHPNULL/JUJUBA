import type { Frente } from "../entities/frente";

/**
 * CRUD mínimo — só o necessário para cadastrar 1-2 frentes por matéria e
 * listá-las. Não é um repositório completo (sem `atualizar`/`remover`
 * ainda) — ver docs/superpowers/specs/2026-08-14-formula-real-e-ui.md.
 */
export interface FrenteRepository {
  criar(frente: Frente): Promise<Frente>;
  listarPorMateria(materiaId: string): Promise<Frente[]>;
}
