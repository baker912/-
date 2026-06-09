const express = require('express');
const { Op, fn, col, where: whereFn } = require('sequelize');

function buildWhere(filters) {
  if (!filters || !Array.isArray(filters) || filters.length === 0) return {};
  const and = [];
  for (const f of filters) {
    if (!f || typeof f !== 'object') continue;
    const { op, column, value } = f;
    if (!column || typeof column !== 'string') continue;
    if (op === 'eq') {
      and.push({ [column]: value });
    } else if (op === 'in') {
      and.push({ [column]: { [Op.in]: Array.isArray(value) ? value : [] } });
    } else if (op === 'like' || op === 'ilike') {
      const pattern = String(value ?? '');
      if (op === 'like') and.push({ [column]: { [Op.like]: pattern } });
      if (op === 'ilike') and.push(whereFn(fn('LOWER', col(column)), { [Op.like]: pattern.toLowerCase() }));
    } else if (op === 'neq') {
      and.push({ [column]: { [Op.ne]: value } });
    } else if (op === 'gt') {
      and.push({ [column]: { [Op.gt]: value } });
    } else if (op === 'gte') {
      and.push({ [column]: { [Op.gte]: value } });
    } else if (op === 'lt') {
      and.push({ [column]: { [Op.lt]: value } });
    } else if (op === 'lte') {
      and.push({ [column]: { [Op.lte]: value } });
    }
  }
  if (and.length === 0) return {};
  return { [Op.and]: and };
}

function buildOrder(order) {
  if (!order || typeof order !== 'object') return undefined;
  const { column, ascending } = order;
  if (!column) return undefined;
  return [[column, ascending === false ? 'DESC' : 'ASC']];
}

function createRestRouter(models) {
  const router = express.Router();

  const tableMap = {
    users: { model: models.User, attributes: { exclude: ['password_hash'] } },
    categories: { model: models.Category },
    departments: { model: models.Department },
    assets: { model: models.Asset, include: [{ model: models.Category, as: 'category' }, { model: models.Department, as: 'department' }, { model: models.User, as: 'manager' }] },
    asset_flow_records: { model: models.AssetFlowRecord, include: [{ model: models.Asset, as: 'asset', include: [{ model: models.Category, as: 'category' }, { model: models.Department, as: 'department' }] }] },
    asset_requests: { model: models.AssetRequest, include: [{ model: models.User, as: 'creator' }] },
    procurement_contracts: { model: models.ProcurementContract, include: [{ model: models.ContractSupplier, as: 'suppliers' }] },
    contract_suppliers: { model: models.ContractSupplier },
    sys_dictionaries: { model: models.SysDictionary },
    sys_dictionary_items: { model: models.SysDictionaryItem },
    asset_dictionary: { model: models.AssetDictionary, include: [{ model: models.User, as: 'creator' }, { model: models.Category, as: 'category' }] }
  };

  function getTable(req, res) {
    const name = req.params.table;
    const t = tableMap[name];
    if (!t) {
      res.status(404).json({ error: { message: `Unknown table: ${name}` } });
      return null;
    }
    return t;
  }

  router.post('/:table/select', async (req, res) => {
    const t = getTable(req, res);
    if (!t) return;
    const { filters, or, order, limit, offset, single } = req.body || {};

    const whereAnd = buildWhere(filters);
    const whereOr = Array.isArray(or) && or.length > 0 ? { [Op.or]: or.map(buildWhere).filter((w) => Object.keys(w).length > 0) } : null;
    const where = whereOr ? { [Op.and]: [whereAnd, whereOr].filter((w) => Object.keys(w).length > 0) } : whereAnd;

    const rows = await t.model.findAll({
      where,
      include: t.include,
      attributes: t.attributes,
      order: buildOrder(order),
      limit: typeof limit === 'number' ? limit : undefined,
      offset: typeof offset === 'number' ? offset : undefined
    });

    if (single) return res.json({ data: rows[0] || null, error: null });
    return res.json({ data: rows, error: null });
  });

  router.post('/:table/insert', async (req, res) => {
    const t = getTable(req, res);
    if (!t) return;
    const { values } = req.body || {};
    const list = Array.isArray(values) ? values : [values];
    const created = await t.model.bulkCreate(list, { returning: true });
    return res.json({ data: created, error: null });
  });

  router.post('/:table/update', async (req, res) => {
    const t = getTable(req, res);
    if (!t) return;
    const { values, filters } = req.body || {};
    const where = buildWhere(filters);
    const [count] = await t.model.update(values || {}, { where });
    return res.json({ data: { count }, error: null });
  });

  router.post('/:table/delete', async (req, res) => {
    const t = getTable(req, res);
    if (!t) return;
    const { filters } = req.body || {};
    const where = buildWhere(filters);
    const count = await t.model.destroy({ where });
    return res.json({ data: { count }, error: null });
  });

  return router;
}

module.exports = { createRestRouter };
