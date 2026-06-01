import { db, categories, templates, templateActions, flows } from './db';

const [cats, tpls, tActs] = await Promise.all([
	db.select({ id: categories.id, name: categories.name }).from(categories).limit(3),
	db.select({ id: templates.id, name: templates.name }).from(templates).limit(3),
	db.select({ id: templateActions.id, templateId: templateActions.templateId }).from(templateActions).limit(3)
]);
console.log(
	'Categories:',
	cats.map((c) => c.id.slice(0, 8))
);
console.log(
	'Templates:',
	tpls.map((t) => t.id.slice(0, 8))
);
console.log(
	'TemplateActions:',
	tActs.map((a) => a.templateId.slice(0, 8))
);
process.exit(0);
