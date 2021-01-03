#!/usr/bin/python3

import os
import asyncio
import json
import logging
import requests
from enum import Enum
from concurrent.futures.thread import ThreadPoolExecutor
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from typing import List, Optional, Dict, Any


from cephadm import cephadm

CONF_PATH = "/etc/rlyeh"

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class State(Enum):
    NONE = 0
    BOOTSTRAP_START = 1
    BOOTSTRAP_END = 2
    BOOTSTRAP_ERROR = 3
    AUTH_START = 4
    AUTH_END = 5
    AUTH_ERROR = 6
    INVENTORY_START = 7
    INVENTORY_WAIT = 8
    INVENTORY_END = 9
    INVENTORY_ERROR = 10


class GlobalState:

    def __init__(self) -> None:
        self.state: State = State.NONE
        self.fsid: str = ""
        self.host: str = ""
        self.port: int = -1
        self.username: str = ""
        self.password: str = ""
        self.token: str = ""
        self.inventory: Dict[str, Any] = {}

    def dump(self) -> Dict[str, Any]:
        return {
            "state": self.state.name,
            "fsid": self.fsid,
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "password": self.password,
            "token": self.token
        }

    def load(self, d: Dict[str, Any]) -> None:
        self.state = State[d["state"]]
        self.fsid = d["fsid"]
        self.host = d["host"]
        self.port = d["port"]
        self.username = d["username"]
        self.password = d["password"]
        self.token = d["token"]


app = FastAPI()
api = FastAPI()


def load_state(gstate: GlobalState) -> None:

    if not os.path.isdir(CONF_PATH):
        os.mkdir(CONF_PATH)

    if os.path.exists(os.path.join(CONF_PATH, "state.json")):
        _read_state(gstate)
    else:
        _write_state(gstate)


def _read_state(gstate: GlobalState) -> None:

    path = os.path.join(CONF_PATH, "state.json")
    assert os.path.exists(path)

    with open(path, "r") as fd:
        d = json.load(fd)
        assert isinstance(d, dict)
        gstate.load(d)


def _write_state(gstate: GlobalState) -> None:
    d = gstate.dump()

    with open(os.path.join(CONF_PATH, "state.json"), "w") as fd:
        json.dump(d, fd)   


def do_authenticated_stuff(gstate: GlobalState) -> None:

    url = f"https://{gstate.host}:{gstate.port}"
    _headers = {
        "Authorization": f"Bearer {gstate.token}",
        "Accept": "application/vnd.ceph.api.v1.0+json",
        "Content-Type": "application/json"
    }
    req = requests.get(f"{url}/api/host", headers=_headers, verify=False)
    print(req.json())
    req = requests.get(f"{url}/api/host/localhost/devices", headers=_headers, verify=False)
    print("-- devices >> " + str(req.json()))

    req = requests.get(f"{url}/api/host/localhost/inventory", headers=_headers, verify=False)
    print("-- inventory >> " + json.dumps(req.json(), indent=4))


def _get_headers(
    gstate: GlobalState, _authenticated: bool
) -> Dict[str, Any]:

    _headers: Dict[str, str] = {
        "Accept": "application/vnd.ceph.api.v1.0+json",
        "Content-Type": "application/json"
    }
    if _authenticated:
        token: str = _obtain_token(gstate)
        _headers["Authorization"] = f"Bearer {token}"
    return _headers


def _get_endpoint(gstate: GlobalState, ep: str) -> str:
    return f"https://{gstate.host}:{gstate.port}/api/{ep}"

def _post(
    gstate: GlobalState,
    endpoint: str,
    _payload: Dict[str, Any],
    _authenticated: bool = False
) -> Dict[str, Any]:

    ep: str = _get_endpoint(gstate, endpoint)
    _headers: Dict[str, Any] = _get_headers(gstate, _authenticated)    
    
    try:
        req = requests.post(ep, json=_payload, headers=_headers, verify=False)
        return req.json()
    except Exception as e:
        print(f"error on post > ep: {ep}, "
              f"payload: {str(_payload)}, headers: {str(_headers)}")
        raise e


def _get(
    gstate: GlobalState,
    endpoint: str,
    _parameters: Dict[str, Any],
    _authenticated: bool = False
) -> Dict[str, Any]:

    ep: str = _get_endpoint(gstate, endpoint)
    _headers: Dict[str, Any] = _get_headers(gstate, _authenticated)    

    try:
        req = requests.get(ep, params=_parameters,
                           headers=_headers, verify=False)
        return req.json()
    except Exception as e:
        print(f"error on get > ep: {ep}, "
              f"params: {str(_parameters)}, headers: {str(_headers)}")
        raise e


def _obtain_token(gstate: GlobalState) -> str:

    _payload: Dict[str, str] = {
        "username": gstate.username,
        "password": gstate.password
    }
    res = _post(gstate, "auth", _payload, False)
    if "token" not in res:
        raise Exception("error obtaining Token")

    # print("token > " + res["token"])
    # print(f"===> TOKEN <===\n{str(res)}")

    return res["token"]


def _change_bootstrap_password(gstate: GlobalState) -> str:
    new_passwd: str = "bootstrapPW"
    _payload: Dict[str, str] = {
        "old_password": gstate.password,
        "new_password": new_passwd
    }
    res = _post(gstate, "user/admin/change_password", _payload, True)
    print("change password > res: " + str(res))
    return new_passwd


def _calc_storage_solutions(
    inventory: Dict[str, Any]
) -> Dict[str, Any]:

    if "devices" not in inventory:
        return {}

    class Device:
        available: bool
        path: str
        size: int
        type: str
        pass

    devices: List[Device] = []
    for device in inventory["devices"]:
        dev = Device()
        dev.available = device["available"]
        dev.path = device["path"]
        dev.size = device["sys_api"]["size"]
        dev.type = device["human_readable_type"]
        devices.append(dev)

    class Solution:
        can_raid0: bool
        can_raid1: bool
        raid0_size: float
        raid1_size: float

    available_devices = [dev for dev in devices if dev.available]
    storage_total = sum([dev.size for dev in available_devices])
    solution = Solution()
    solution.can_raid0 = (len(available_devices) > 0)
    solution.raid0_size = storage_total if solution.can_raid0 else 0
    solution.can_raid1 = (len(available_devices) >= 2)
    solution.raid1_size = (storage_total / 2.0) if solution.can_raid1 else 0

    result: Dict[str, Any] = {
        "solution": solution.__dict__,
        "devices": [d.__dict__ for d in devices]
    }

    return result


def do_obtain_inventory(gstate: GlobalState) -> None:

    assert gstate.state == State.AUTH_END or \
           gstate.state == State.INVENTORY_START

    assert gstate.token != ""

    gstate.state = State.INVENTORY_START
    # _write_state(gstate) # don't save state, always call on restart

    res = _get(gstate, "orchestrator/status", {}, True)
    print("--- orchestrator status: " + str(res))

    host: str = "localhost"  # this should be programatically obtained
    ep: str = f"host/{host}/inventory"
    res = _get(gstate, ep, {}, True)
    print("--- inventory: " + str(res))
    gstate.inventory = _calc_storage_solutions(res)
    print("--- solution: " + str(gstate.inventory))

    gstate.state = State.INVENTORY_WAIT  # wait for user input


def do_authentication(gstate: GlobalState) -> None:

    assert gstate.host != "" and gstate.port > 0 and \
           gstate.username != "" and gstate.password != ""

    gstate.state = State.AUTH_START
    _write_state(gstate)

    token: str = _obtain_token(gstate)
    if not token:
        raise Exception("unable to obtain token")

    gstate.token = token
    _write_state(gstate)

    new_passwd: str = _change_bootstrap_password(gstate)
    gstate.password = new_passwd
    _write_state(gstate)

    token: str = _obtain_token(gstate)
    if not token:
        raise Exception("unable to obtain token again")
    gstate.token = token
    gstate.state = State.AUTH_END
    _write_state(gstate)


def do_bootstrap(gstate: GlobalState) -> None:

    gstate.state = State.BOOTSTRAP_START
    _write_state(gstate)

    try:
        ctx = cephadm.cephadm_init("check-host".split())
        if not ctx:
            return None

        logger.info("has context for check-host")
        host = cephadm.HostFacts(ctx)
        hostinfo = json.loads(host.dump())
        logger.info("host info obtained")

        candidates: List[str] = []
        for iface, info in hostinfo["interfaces"].items():
            if info["iftype"] == "loopback":
                continue

            candidates.append(info["ipv4_address"])
        
        selected: Optional[str] = None
        if len(candidates) > 0:
            selected = candidates[0]

        if selected is not None:
            netmask_idx = selected.find("/")
            if netmask_idx > 0:
                selected = selected[:netmask_idx]
        else:
            return None

        logger.info("prepare bootstrap")
        ctx = cephadm.cephadm_init(
            f"--verbose bootstrap --skip-prepare-host --mon-ip {selected}".split())
        if not ctx:
            return None

        logger.info("bootstrap!")
        bootstrap_info = cephadm.cephadm_bootstrap(ctx)
        print("bootstrap result: " + json.dumps(bootstrap_info))
        gstate.state = State.BOOTSTRAP_END
        dashboard_info = bootstrap_info["dashboard"]
        gstate.fsid = bootstrap_info["fsid"]
        gstate.host = dashboard_info["host"]
        gstate.port = dashboard_info["port"]
        gstate.username = dashboard_info["user"]
        gstate.password = dashboard_info["password"]
        
        _write_state(gstate)

        # XXX: nasty hack
        # let system settle a bit
        
        import time
        time.sleep(10)

    except Exception as e:
        gstate.state = State.BOOTSTRAP_ERROR
        _write_state(gstate)
        raise Exception(e)


def do_start(gstate: GlobalState) -> None:
    logger.info("----------> START <----------")

    load_state(gstate)

    logger.info("start bootstrapping")

    if gstate.state == State.NONE:
        do_bootstrap(gstate)

    if gstate.state == State.BOOTSTRAP_END or \
       gstate.state == State.AUTH_START:
        do_authentication(gstate)

    if gstate.state == State.AUTH_END or \
       gstate.state == State.INVENTORY_START:
        do_obtain_inventory(gstate)

    return


@app.on_event("startup")
async def on_startup():

    gstate = GlobalState()
    app.state.executor = ThreadPoolExecutor()
    app.state.gstate = gstate

    loop = asyncio.get_event_loop()
    loop.run_in_executor(app.state.executor, do_start, gstate)


@app.on_event("shutdown")
async def on_shutdown():
    app.state.executor.shutdown()



@api.get("/status")
async def get_status():

    gstate = app.state.gstate
    state: State = gstate.state
    state_name: str = state.name

    return { "status": state_name }


@api.get("/inventory")
async def get_inventory():

    gstate: GlobalState = app.state.gstate
    inventory: Dict[str, Any] = gstate.inventory
    return inventory


app.mount(
    "/api",
    api,
    name="api"
)
app.mount(
    "/",
    StaticFiles(directory="frontend/dist/cthulhu", html=True),
    name="static"
)

