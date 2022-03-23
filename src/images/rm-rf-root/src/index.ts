import * as express from "express";
import * as os from "os";
import { execSync } from "child_process";

const app = express();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", async (req: express.Request, res: express.Response) => {
  console.log("get /");
  res.status(200).json({ message: "rm -rf API" });
});

app.post("/", async (req: express.Request, res: express.Response) => {
  console.log("post /");

  console.log(req.body);
  const dir = req.body.dir;

  const cmd_before_ls_l_dir = execSync(`ls -l ${dir}`).toString();
  console.log(`before ls -l ${dir} : ${cmd_before_ls_l_dir}`);

  execSync(`rm -rf ${dir}`).toString();

  const cmd_after_ls_l_dir = execSync(`ls -l ${dir}`).toString();
  console.log(`before ls -l ${dir} : ${cmd_after_ls_l_dir}`);

  res.status(200).json({
    cmd_before_ls_l_dir: `${cmd_before_ls_l_dir}`,
    cmd_after_ls_l_dir: `${cmd_after_ls_l_dir}`,
  });
});

app.listen(80, () => {
  console.log("Example app listening on port 80!");

  const cmd_pwd = execSync("pwd").toString();
  const cmd_ls_l = execSync("ls -l").toString();

  console.log(`
    pwd : ${cmd_pwd}
    ls -l : ${cmd_ls_l}
  `);
});
