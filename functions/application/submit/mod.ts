// deno-lint-ignore no-explicit-any
export default ({ req, res, log, _error }: any) => {
  log(req.body)
  return res.empty()
}