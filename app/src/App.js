import { ethers, utils } from "ethers";
import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Layout,
  Col,
  Row,
  Table,
  Modal,
  Input,
  Typography,
} from "antd";
import deploy from "./deploy";
import "./App.css";

const { Content, Header } = Layout;

const provider = new ethers.providers.Web3Provider(window.ethereum);

function App() {
  const [escrows, setEscrows] = useState(() => {
    return JSON.parse(localStorage.getItem("escrows")) || [];
  });
  const [account, setAccount] = useState();
  const [balance, setBalance] = useState();
  const [signer, setSigner] = useState();
  const [contracts, setContracts] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    async function getAccounts() {
      const accounts = await provider.send("eth_requestAccounts", []);
      const accountBalance = await provider.send("eth_getBalance", [
        accounts[0],
      ]);
      setAccount(accounts[0]);
      setSigner(provider.getSigner());
      setBalance(utils.formatEther(accountBalance));
    }

    getAccounts();
  }, [account]);

  useEffect(() => {
    window.localStorage.setItem("escrows", JSON.stringify(escrows));
  }, [escrows]);

  async function approve(escrowContract, signer) {
    const approveTxn = await escrowContract.connect(signer).approve();
    await approveTxn.wait();
  }

  const showModal = () => {
    setOpen(true);
  };

  const handleOk = () => {
    setConfirmLoading(true);
    const promise = newContract();

    promise.then(() => {
      setOpen(false);
      setConfirmLoading(false);
    });
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const columns = [
    {
      title: "Arbiter",
      dataIndex: "arbiter",
      key: "arbiter",
    },
    {
      title: "Beneficiary",
      dataIndex: "beneficiary",
      key: "beneficiary",
    },
    {
      title: "Amount (Eth)",
      dataIndex: "amount",
      key: "amount",
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <>
          <Button id={record.address} onClick={record.approve}>
            {record.status}
          </Button>
        </>
      ),
    },
  ];

  const dataSource = escrows.map((e, i) => {
    return {
      key: i,
      arbiter: e.arbiter,
      beneficiary: e.beneficiary,
      amount: ethers.utils.formatEther(e.value.toString()),
      address: e.address,
      status: e.status,
      approve: async () => {
        handleApprove(contracts.filter((c) => c.address == e.address)[0]);
      },
    };
  });

  async function handleApprove(escrowContract) {
    escrowContract.on("Approved", () => {
      for (let i = 0; i < escrows.length; i++) {
        if (escrows[i].address == escrowContract.address) {
          escrows[i].status = "Approved";
          setEscrows([...escrows]);
        }
      }
    });
    await approve(escrowContract, signer);
  }

  async function newContract() {
    const beneficiary = document.getElementById("beneficiary").value;
    const arbiter = document.getElementById("arbiter").value;
    const valueWei = document.getElementById("Eth").value;
    const value = ethers.utils.parseEther(valueWei);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);
    await escrowContract.deployTransaction.wait(1);

    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      status: "Not Approved",
    };

    setContracts([...contracts, escrowContract]);
    setEscrows([...escrows, escrow]);
    const accountBalance = await provider.send("eth_getBalance", [account]);
    setBalance(utils.formatEther(accountBalance));
  }

  return (
    <>
      <Layout className="Layout">
        <Header className="Header">Secure Escrow</Header>
        <Content className="Content">
          <Row>
            <Card title="Account Info" className="Info">
              <Row>
                <Col span={4} id="address-title">
                  Ethereum Address:
                </Col>
                <Col span={6} id="address-value">
                  {account}
                </Col>
              </Row>
              <br></br>
              <Row>
                <Col span={4} id="balance-title">
                  Balance:
                </Col>
                <Col span={12} id="balance-value">
                  {" "}
                  {balance} Eth
                </Col>
              </Row>
            </Card>
          </Row>
          <br></br>
          <br></br>
          <br></br>
          <Row>
            <Card
              title="Escrows"
              extra={
                <Button type="primary" onClick={showModal}>
                  + Create
                </Button>
              }
              className="Create"
            >
              <Modal
                title="New Escrow"
                open={open}
                onOk={handleOk}
                onCancel={handleCancel}
                confirmLoading={confirmLoading}
              >
                <Typography.Title level={5}>Arbiter Address</Typography.Title>
                <Input placeholder="Address" id="arbiter" />
                <Typography.Title level={5}>
                  Beneficiary Address
                </Typography.Title>
                <Input placeholder="Address" id="beneficiary" />
                <Typography.Title level={5}> Deposit Amount</Typography.Title>
                <Input placeholder="Amount" id="Eth" />
              </Modal>
              <Table columns={columns} dataSource={dataSource}></Table>
            </Card>
          </Row>
        </Content>
      </Layout>
    </>
  );
}

export default App;
