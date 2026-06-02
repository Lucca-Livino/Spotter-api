import { DataBase } from "../config/DbConnect";
import { treinador, treinador_academia } from "../config/db/schema";
import { auth } from "../utils/auth";

const treinadoresSeed = [
	{
		name: "Carlos Silva",
		email: "carlos.silva@gmail.com",
		password: "Admin@2026!",
		perfil: {
			nome: "Carlos Silva",
			data_nascimento: "1982-05-10",
			sexo: "M" as const,
			cref: "000001-G/RO",
			turnos: ["MANHA", "TARDE", "NOITE"] as ("MANHA" | "TARDE" | "NOITE")[],
			especializacao: "Gestão e Administração",
			graduacao: "Educação Física - Bacharel",
			is_admin: true,
		},
		academiaIndex: 0,
	},
	{
		name: "Marcos Antônio Rocha",
		email: "marcos.rocha@personalfit.com",
		password: "Treinador@2026!",
		perfil: {
			nome: "Marcos Antônio Rocha",
			data_nascimento: "1985-01-20",
			sexo: "M" as const,
			cref: "012345-G/RO",
			turnos: ["MANHA", "TARDE"] as ("MANHA" | "TARDE" | "NOITE")[],
			especializacao: "Hipertrofia e Força",
			graduacao: "Educação Física - Bacharel",
			is_admin: true,
		},
		academiaIndex: 0,
	},
	{
		name: "Fernanda Souza Almeida",
		email: "fernanda.almeida@personalfit.com",
		password: "Treinador@2026!",
		perfil: {
			nome: "Fernanda Souza Almeida",
			data_nascimento: "1990-09-14",
			sexo: "F" as const,
			cref: "067890-G/RO",
			turnos: ["TARDE", "NOITE"] as ("MANHA" | "TARDE" | "NOITE")[],
			especializacao: "Emagrecimento e Condicionamento",
			graduacao: "Educação Física - Licenciatura",
			is_admin: false,
		},
		academiaIndex: 1,
	},
	{
		name: "Paulo Muzy",
		email: "paulo.muzy@ironberg.com",
		password: "Senha@123",
		perfil: {
			nome: "Paulo Muzy",
			data_nascimento: "1979-07-16",
			sexo: "M" as const,
			cref: "123456-G/SP",
			turnos: ["MANHA", "TARDE"] as ("MANHA" | "TARDE" | "NOITE")[],
			especializacao: "Hipertrofia e Emagrecimento",
			graduacao: "Educação Física - Bacharel",
			is_admin: false,
		},
		academiaIndex: 1,
	},
];

type TreinadorSeedResult = {
	id: string;
	nome: string;
};

export async function seedTreinadores(academiasIds: string[]): Promise<TreinadorSeedResult[]> {
	if (academiasIds.length === 0) {
		throw new Error("Nenhuma academia encontrada para vincular treinadores.");
	}

	const treinadoresValues = [];
	for (const seed of treinadoresSeed) {
	        const authUser = await auth.api.signUpEmail({
	                body: { 
	                        name: seed.name, 
	                        email: seed.email, 
	                        password: seed.password,
	                        tipo: "treinador"
	                } as any,
	        });

		treinadoresValues.push({
			user_id: authUser.user.id,
			academia_id: academiasIds[seed.academiaIndex],
			...seed.perfil,
		});
	}

	const treinadoresCriados = await DataBase
		.insert(treinador)
		.values(treinadoresValues)
		.returning({ id: treinador.id, nome: treinador.nome, academia_id: treinador.academia_id });

	// Criar vínculos na tabela N:N treinador_academia
	const treinadorAcademiaValues = treinadoresCriados.map(t => ({
		treinador_id: t.id,
		academia_id: t.academia_id
	}));

	if (treinadorAcademiaValues.length > 0) {
		await DataBase.insert(treinador_academia).values(treinadorAcademiaValues);
	}

	return treinadoresCriados.map(t => ({ id: t.id, nome: t.nome }));
}
